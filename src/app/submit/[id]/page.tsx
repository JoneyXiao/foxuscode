'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createClientComponentClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/lib/validations';
import { Loader2, CheckCircle, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { FoxIcon } from '@/components/iconify-icons';
import { toast } from 'sonner';

interface Props {
    params: Promise<{
        id: string;
    }>;
}

interface Form {
    id: string;
    title: string;
    description?: string;
    fields: FormField[];
    email_recipient: string;
    created_at: string;
}

interface UploadedFile {
    file: File;
    path: string;
    originalFileName: string;
    uploading: boolean;
    uploaded: boolean;
    error?: string;
}

export default function SubmitFormPage({ params }: Props) {
    const { t, ready } = useTranslation();
    const [form, setForm] = useState<Form | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const [formId, setFormId] = useState<string>('');
    const [notFound, setNotFound] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile[]>>({});
    const supabase = createClientComponentClient();

    useEffect(() => {
        setIsClient(true);
        params.then(({ id }) => setFormId(id));
    }, [params]);

    useEffect(() => {
        const fetchForm = async () => {
            if (!formId) return;

            try {
                const { data: form, error } = await supabase
                    .from('forms')
                    .select('*')
                    .eq('id', formId)
                    .eq('is_active', true)
                    .single();

                if (error || !form) {
                    console.error('Error fetching form:', error);
                    setNotFound(true);
                } else {
                    setForm(form);
                    // Initialize form data with default values
                    const initialData: Record<string, unknown> = {};
                    form.fields.forEach((field: FormField) => {
                        if (field.type === 'checkbox') {
                            initialData[field.id] = false;
                        } else {
                            initialData[field.id] = '';
                        }
                    });
                    setFormData(initialData);
                }
            } catch (error) {
                console.error('Error fetching form:', error);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };

        if (isClient && formId) {
            fetchForm();
        }
    }, [formId, isClient, supabase]);

    const handleInputChange = (fieldId: string, value: unknown) => {
        setFormData(prev => ({
            ...prev,
            [fieldId]: value
        }));
        
        // Clear error when user starts typing
        if (errors[fieldId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldId];
                return newErrors;
            });
        }
    };

    const handleFileUpload = async (fieldId: string, files: FileList) => {
        const field = form?.fields.find(f => f.id === fieldId);
        if (!field || !files.length) return;

        const newUploadedFiles: UploadedFile[] = [];

        // Validate files
        for (const file of Array.from(files)) {
            // Check file size
            if (field.fileConstraints?.maxSize && file.size > field.fileConstraints.maxSize * 1024 * 1024) {
                toast.error(t('errors.fileTooLarge') + ` (${file.name}). ${t('forms.fileConstraints.maxSize')}: ${field.fileConstraints.maxSize}MB`);
                continue;
            }

            // Check file type
            if (field.fileConstraints?.allowedTypes?.length) {
                const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
                if (!field.fileConstraints.allowedTypes.includes(fileExtension)) {
                    toast.error(t('errors.invalidFileType') + ` (${file.name}). ${t('forms.fileConstraints.allowedTypes')}: ${field.fileConstraints.allowedTypes.join(', ')}`);
                    continue;
                }
            }

            newUploadedFiles.push({
                file,
                path: '',
                originalFileName: file.name,
                uploading: true,
                uploaded: false
            });
        }

        // Update state with uploading files
        setUploadedFiles(prev => ({
            ...prev,
            [fieldId]: [...(prev[fieldId] || []), ...newUploadedFiles]
        }));

        // Upload each file
        for (let i = 0; i < newUploadedFiles.length; i++) {
            const uploadedFile = newUploadedFiles[i];
            
            try {
                // Get signed upload URL
                const uploadUrlResponse = await fetch('/api/storage/upload-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: uploadedFile.file.name,
                        fileType: uploadedFile.file.type
                    })
                });

                if (!uploadUrlResponse.ok) {
                    throw new Error(t('errors.fileUploadFailed'));
                }

                const { path: filePath, token } = await uploadUrlResponse.json();

                // Upload file to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('form-files')
                    .uploadToSignedUrl(filePath, token, uploadedFile.file);

                if (uploadError) {
                    throw new Error(uploadError.message);
                }

                // Update file state as uploaded
                setUploadedFiles(prev => {
                    const updated = { ...prev };
                    const fileIndex = updated[fieldId].findIndex(f => f.file.name === uploadedFile.file.name && f.uploading);
                    if (fileIndex !== -1) {
                        updated[fieldId][fileIndex] = {
                            ...updated[fieldId][fileIndex],
                            path: filePath,
                            uploading: false,
                            uploaded: true
                        };
                    }
                    return updated;
                });

            } catch (error) {
                console.error('File upload error:', error);
                
                // Update file state with error
                setUploadedFiles(prev => {
                    const updated = { ...prev };
                    const fileIndex = updated[fieldId].findIndex(f => f.file.name === uploadedFile.file.name && f.uploading);
                    if (fileIndex !== -1) {
                        updated[fieldId][fileIndex] = {
                            ...updated[fieldId][fileIndex],
                            uploading: false,
                            uploaded: false,
                            error: error instanceof Error ? error.message : t('errors.fileUploadFailed')
                        };
                    }
                    return updated;
                });

                toast.error(t('errors.fileUploadFailed') + `: ${uploadedFile.file.name}`);
            }
        }
    };

    const removeFile = (fieldId: string, fileName: string) => {
        setUploadedFiles(prev => ({
            ...prev,
            [fieldId]: prev[fieldId]?.filter(f => f.file.name !== fileName) || []
        }));
    };

    const validateForm = (): boolean => {
        if (!form) return false;
        
        const newErrors: Record<string, string> = {};
        
        form.fields.forEach((field: FormField) => {
            if (field.required) {
                const value = formData[field.id];
                const files = uploadedFiles[field.id];
                
                if (field.type === 'file') {
                    if (!files?.length || !files.some(f => f.uploaded)) {
                        newErrors[field.id] = t('errors.fieldRequired');
                    }
                } else if (value === undefined || value === null || value === '' || 
                    (field.type === 'checkbox' && !value)) {
                    newErrors[field.id] = t('errors.fieldRequired');
                }
            }
            
            // Email validation
            if (field.type === 'email' && formData[field.id]) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(String(formData[field.id]))) {
                    newErrors[field.id] = t('errors.invalidEmail');
                }
            }
        });
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!form || !validateForm()) {
            toast.error(t('errors.formValidationFailed'));
            return;
        }

        setSubmitting(true);

        try {
            // Prepare submission data with file paths and original filenames
            const submissionData = { ...formData };
            const filePaths: string[] = [];
            const fileMetadata: Record<string, { path: string; originalFileName: string }[]> = {};

            // Add file paths and metadata to submission data
            Object.entries(uploadedFiles).forEach(([fieldId, files]) => {
                const uploadedFileData = files
                    .filter(f => f.uploaded)
                    .map(f => ({ path: f.path, originalFileName: f.originalFileName }));
                
                if (uploadedFileData.length > 0) {
                    submissionData[fieldId] = uploadedFileData.map(f => f.path);
                    filePaths.push(...uploadedFileData.map(f => f.path));
                    fileMetadata[fieldId] = uploadedFileData;
                }
            });

            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formId: form.id,
                    data: submissionData,
                    filePaths, // Send file paths for email attachments
                    fileMetadata, // Send original filenames for email display
                    language: localStorage.getItem('i18nextLng') || 'zh-CN',
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setSubmitted(true);
                toast.success(t('success.formSubmitted'));
            } else {
                if (result.missingFields) {
                    const newErrors: Record<string, string> = {};
                    form.fields.forEach(field => {
                        if (result.missingFields.includes(field.label)) {
                            newErrors[field.id] = t('errors.fieldRequired');
                        }
                    });
                    setErrors(newErrors);
                }
                toast.error(result.error || t('errors.submissionFailed'));
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            toast.error(t('errors.networkError'));
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (field: FormField) => {
        const fieldError = errors[field.id];
        const baseProps = {
            id: field.id,
            name: field.id,
            required: field.required,
            value: String(formData[field.id] || ''),
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
                handleInputChange(field.id, e.target.value),
        };

        switch (field.type) {
            case 'text':
                return (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                            )}
                        </Label>
                        <Input
                            {...baseProps}
                            type="text"
                            placeholder={field.placeholder}
                            className={fieldError ? 'border-red-500' : ''}
                        />
                        {fieldError && (
                            <p className="text-sm text-red-500">{fieldError}</p>
                        )}
                    </div>
                );

            case 'email':
                return (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                            )}
                        </Label>
                        <Input
                            {...baseProps}
                            type="email"
                            placeholder={field.placeholder}
                            className={fieldError ? 'border-red-500' : ''}
                        />
                        {fieldError && (
                            <p className="text-sm text-red-500">{fieldError}</p>
                        )}
                    </div>
                );

            case 'number':
                return (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                            )}
                        </Label>
                        <Input
                            {...baseProps}
                            type="number"
                            placeholder={field.placeholder}
                            className={fieldError ? 'border-red-500' : ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value ? Number(e.target.value) : '')}
                        />
                        {fieldError && (
                            <p className="text-sm text-red-500">{fieldError}</p>
                        )}
                    </div>
                );

            case 'date':
                return (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                            )}
                        </Label>
                        <Input 
                            {...baseProps} 
                            type="date" 
                            className={fieldError ? 'border-red-500' : ''}
                        />
                        {fieldError && (
                            <p className="text-sm text-red-500">{fieldError}</p>
                        )}
                    </div>
                );

            case 'select':
                return (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                            )}
                        </Label>
                        <Select 
                            value={String(formData[field.id] || '')} 
                            onValueChange={(value) => handleInputChange(field.id, value)}
                        >
                            <SelectTrigger className={fieldError ? 'border-red-500' : ''}>
                                                            <SelectValue
                                placeholder={field.placeholder || t('common.select')}
                            />
                            </SelectTrigger>
                            <SelectContent>
                                {field.options?.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {fieldError && (
                            <p className="text-sm text-red-500">{fieldError}</p>
                        )}
                    </div>
                );

            case 'checkbox':
                return (
                    <div key={field.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id={field.id}
                                name={field.id}
                                checked={Boolean(formData[field.id])}
                                onCheckedChange={(checked) => handleInputChange(field.id, checked)}
                                className={fieldError ? 'border-red-500' : ''}
                            />
                            <Label htmlFor={field.id}>
                                {field.label}
                                {field.required && (
                                    <span className="text-red-500 ml-1">*</span>
                                )}
                            </Label>
                        </div>
                        {fieldError && (
                            <p className="text-sm text-red-500">{fieldError}</p>
                        )}
                    </div>
                );

            case 'file':
                const fieldFiles = uploadedFiles[field.id] || [];
                return (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                            )}
                        </Label>
                        <div className="space-y-3">
                            <Input 
                                id={field.id}
                                name={field.id}
                                type="file" 
                                multiple 
                                className={fieldError ? 'border-red-500' : ''}
                                onChange={(e) => {
                                    if (e.target.files) {
                                        handleFileUpload(field.id, e.target.files);
                                    }
                                }}
                            />
                            {field.fileConstraints && (
                                <p className="text-sm text-gray-500">
                                    {t('forms.fileConstraints.maxSize')}: {field.fileConstraints.maxSize}MB
                                    {field.fileConstraints.allowedTypes.length > 0 &&
                                        ` • ${t('forms.fileConstraints.allowedTypes')}: ${field.fileConstraints.allowedTypes.join(', ')}`}
                                </p>
                            )}
                            
                            {/* Display uploaded files */}
                            {fieldFiles.length > 0 && (
                                <div className="space-y-2">
                                    {fieldFiles.map((uploadedFile, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                            <div className="flex items-center space-x-2">
                                                {uploadedFile.uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                                                {uploadedFile.uploaded && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                {uploadedFile.error && <X className="h-4 w-4 text-red-500" />}
                                                <span className="text-sm">{uploadedFile.file.name}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {uploadedFile.error && (
                                                    <span className="text-xs text-red-500">{uploadedFile.error}</span>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFile(field.id, uploadedFile.file.name)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {fieldError && (
                            <p className="text-sm text-red-500">{fieldError}</p>
                        )}
                    </div>
                );

            default:
                return (
                    <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                            )}
                        </Label>
                        <Textarea
                            id={field.id}
                            name={field.id}
                            placeholder={field.placeholder}
                            required={field.required}
                            rows={3}
                            value={String(formData[field.id] || '')}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className={fieldError ? 'border-red-500' : ''}
                        />
                        {fieldError && (
                            <p className="text-sm text-red-500">{fieldError}</p>
                        )}
                    </div>
                );
        }
    };

    // Show loading during hydration or while fetching form
    if (!isClient || !ready || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    if (notFound || !form) {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Header with Language Switcher */}
                <header className="bg-white border-b">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className='flex items-center gap-2'>
                                <FoxIcon size={32} />
                                <h1 className="text-2xl font-bold text-slate-900">
                                    {t('app.name')}
                                </h1>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <LanguageSwitcher />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold text-red-600">
                                {t('errors.formNotFound')}
                            </CardTitle>
                            <CardDescription>
                                {t('errors.formNotFoundDescription')}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        );
    }

    // Success page after submission
    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Header with Language Switcher */}
                <header className="bg-white border-b">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className='flex items-center gap-2'>
                                <FoxIcon size={32} />
                                <h1 className="text-xl font-bold text-slate-900">{t('app.name')}</h1>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <LanguageSwitcher />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8">
                    <div className="max-w-2xl mx-auto">
                        <Card>
                            <CardHeader className="text-center">
                                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                <CardTitle className="text-2xl font-bold text-green-600">
                                    {t('success.formSubmitted')}
                                </CardTitle>
                                <CardDescription className="text-base">
                                    {t('success.formSubmittedDescription')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-center">
                                <Button 
                                    onClick={() => {
                                        // Reset form state to allow another submission
                                        setSubmitted(false);
                                        setFormData(() => {
                                            const initialData: Record<string, unknown> = {};
                                            form?.fields.forEach((field: FormField) => {
                                                if (field.type === 'checkbox') {
                                                    initialData[field.id] = false;
                                                } else {
                                                    initialData[field.id] = '';
                                                }
                                            });
                                            return initialData;
                                        });
                                        setUploadedFiles({});
                                        setErrors({});
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {t('forms.submitAnother')}
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="text-center mt-8">
                            <p className="text-sm text-gray-500">
                                {t('common.poweredBy')} {t('app.name')}
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with Language Switcher */}
            <header className="bg-white border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className='flex items-center gap-2'>
                            <FoxIcon size={32} />
                            <h1 className="text-xl font-bold text-slate-900">{t('app.name')}</h1>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold">
                                {form.title}
                            </CardTitle>
                            {form.description && (
                                <CardDescription className="text-base">
                                    {form.description}
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {form.fields?.map((field: FormField) => renderField(field))}

                                <div className="pt-6">
                                    <Button 
                                        type="submit" 
                                        className="w-full" 
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {t('common.submitting')}
                                            </>
                                        ) : (
                                            t('common.submit')
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="text-center mt-8">
                        <p className="text-sm text-gray-500">
                            {t('common.poweredBy')} {t('app.name')}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
