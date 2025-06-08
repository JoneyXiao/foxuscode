'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { createClientComponentClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save, ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { FormField } from '@/lib/validations';
import { toast } from 'sonner';
import { Navbar } from '@/components/navbar';
import { User } from '@supabase/supabase-js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
    params: Promise<{
        id: string;
    }>;
}

interface FormData {
    title: string;
    description: string;
    fields: FormField[];
    emailRecipient: string;
    emailSubject: string;
}

const initialFormData: FormData = {
    title: '',
    description: '',
    fields: [],
    emailRecipient: '',
    emailSubject: '',
};

export default function EditFormPage({ params }: Props) {
    const router = useRouter();
    const { t, ready } = useTranslation();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [formId, setFormId] = useState<string>('');
    const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
    const supabase = createClientComponentClient();

    const fetchForm = useCallback(async (formId: string, userId: string) => {
        try {
            const { data: form, error } = await supabase
                .from('forms')
                .select('*')
                .eq('id', formId)
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('Error fetching form:', error);
                toast.error(t('errors.formNotFound'));
                router.push('/dashboard');
                return;
            }

            setFormData({
                title: form.title,
                description: form.description || '',
                fields: form.fields as FormField[],
                emailRecipient: form.email_recipient,
                emailSubject: form.email_subject || '',
            });
        } catch (error) {
            console.error('Error fetching form:', error);
            toast.error(t('errors.generic'));
            router.push('/dashboard');
        }
    }, [supabase, router, t]);

    useEffect(() => {
        setIsClient(true);
        params.then(({ id }) => setFormId(id));
    }, [params]);

    useEffect(() => {
        const getUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setUser(user);

            if (!user) {
                router.push('/auth/signin');
                return;
            }

            if (formId) {
                await fetchForm(formId, user.id);
            }
            setLoading(false);
        };

        if (isClient && formId) {
            getUser();
        }
    }, [router, supabase.auth, isClient, formId, fetchForm]);

    // Show loading during hydration or while checking auth
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

    if (!user) {
        return null;
    }

    const fieldTypes = [
        { value: 'text', label: t('forms.fields.fieldTypes.text') },
        { value: 'number', label: t('forms.fields.fieldTypes.number') },
        { value: 'email', label: t('forms.fields.fieldTypes.email') },
        { value: 'date', label: t('forms.fields.fieldTypes.date') },
        { value: 'select', label: t('forms.fields.fieldTypes.select') },
        { value: 'checkbox', label: t('forms.fields.fieldTypes.checkbox') },
        { value: 'file', label: t('forms.fields.fieldTypes.file') },
    ];

    const addField = () => {
        const newField: FormField = {
            id: `field-${Date.now()}`,
            type: 'text',
            label: '',
            placeholder: '',
            required: false,
            options: [], // Initialize with empty options array
        };
        setFormData((prev) => ({
            ...prev,
            fields: [...prev.fields, newField],
        }));
    };

    const updateField = (index: number, field: Partial<FormField>) => {
        setFormData((prev) => ({
            ...prev,
            fields: prev.fields.map((f, i) => (i === index ? { ...f, ...field } : f)),
        }));
    };

    const addOption = (fieldIndex: number) => {
        const field = formData.fields[fieldIndex];
        const newOptions = [...(field.options || []), ''];
        updateField(fieldIndex, { options: newOptions });
    };

    const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
        const field = formData.fields[fieldIndex];
        const newOptions = [...(field.options || [])];
        newOptions[optionIndex] = value;
        updateField(fieldIndex, { options: newOptions });
    };

    const removeOption = (fieldIndex: number, optionIndex: number) => {
        const field = formData.fields[fieldIndex];
        const newOptions = (field.options || []).filter((_, i) => i !== optionIndex);
        updateField(fieldIndex, { options: newOptions });
    };

    const removeField = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            fields: prev.fields.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`/api/forms/${formId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to update form');
            }

            toast.success(t('success.formUpdated'));
            router.push(`/forms/${formId}/qr`);
        } catch (error) {
            console.error('Error updating form:', error);
            toast.error(t('errors.generic'));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFieldExpanded = (fieldId: string) => {
        setExpandedFields(prev => ({
            ...prev,
            [fieldId]: !prev[fieldId]
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            <Navbar user={user} showCreateButton={false} />

            {/* Main Content */}
            <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Mobile-optimized header */}
                {/* {`/forms/${formId}/qr`} */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <Link href="/dashboard" className="self-start">
                        <Button variant="ghost" size="sm" className="h-9 px-3">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            <span>{t('common.back')}</span>
                        </Button>
                    </Link>
                    {/* <div className="flex-1 min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight truncate">
                            {t('forms.edit')} - &quot;{formData.title}&quot;
                        </h1>
                    </div> */}
                </div>

                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                    <div className="grid gap-4 sm:gap-6 lg:gap-8">
                        {/* Form Basic Info - Enhanced mobile layout */}
                        <Card className="border-0 sm:border shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg sm:text-xl">{t('forms.fields.formInfo')}</CardTitle>
                                <CardDescription className="text-sm">
                                    {t('forms.fields.formInfoDescription')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 sm:space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-sm font-medium">
                                        {t('forms.fields.title')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                title: e.target.value,
                                            }))
                                        }
                                        placeholder={t('forms.fields.titlePlaceholder') || 'Enter form title'}
                                        required
                                        className="h-11 sm:h-10 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-sm font-medium">
                                        {t('forms.fields.description')} 
                                        <span className="text-slate-500 text-xs ml-1">({t('common.optional')})</span>
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                description: e.target.value,
                                            }))
                                        }
                                        placeholder={t('forms.fields.descriptionPlaceholder') || 'Enter form description'}
                                        className="min-h-[80px] resize-y text-sm"
                                    />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="emailRecipient" className="text-sm font-medium">
                                            {t('forms.fields.emailRecipient')} <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="emailRecipient"
                                            type="email"
                                            value={formData.emailRecipient}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    emailRecipient: e.target.value,
                                                }))
                                            }
                                            placeholder={t('forms.fields.emailRecipientPlaceholder') || 'Enter recipient email'}
                                            required
                                            className="h-11 sm:h-10 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="emailSubject" className="text-sm font-medium">
                                            {t('forms.fields.emailSubject')}
                                        </Label>
                                        <Input
                                            id="emailSubject"
                                            value={formData.emailSubject}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    emailSubject: e.target.value,
                                                }))
                                            }
                                            placeholder={t('forms.fields.emailSubjectPlaceholder') || 'Enter email subject'}
                                            className="h-11 sm:h-10 text-sm"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Form Fields - Enhanced mobile layout */}
                        <Card className="border-0 sm:border shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg sm:text-xl">{t('forms.fields.addField')}</CardTitle>
                                        <CardDescription className="text-sm">
                                            {t('forms.builder.dragHere')}
                                        </CardDescription>
                                    </div>
                                    <Button 
                                        type="button" 
                                        onClick={addField} 
                                        variant="outline"
                                        className="h-10 w-full sm:w-auto"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t('forms.fields.addField')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 sm:space-y-4">
                                    {formData.fields.map((field, index) => (
                                        <Card key={field.id} className="border border-gray-200 shadow-sm">
                                            <Collapsible
                                                open={expandedFields[field.id] ?? false}
                                                onOpenChange={() => toggleFieldExpanded(field.id)}
                                            >
                                                <CollapsibleTrigger asChild>
                                                    <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                                                                        {index + 1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-medium text-sm truncate">
                                                                            {fieldTypes.find(type => type.value === field.type)?.label || field.type}
                                                                        </h4>
                                                                        <p className="text-xs text-gray-500 truncate">
                                                                            {field.label ? `${field.label}` : `${t('common.field')} ${index + 1}`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeField(index);
                                                                    }}
                                                                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                                {expandedFields[field.id] ? (
                                                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                                                ) : (
                                                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <CardContent className="pt-4 space-y-4">
                                                        <div className="grid gap-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`label-${index}`} className="text-sm font-medium">
                                                                    {t('forms.fields.properties.label')} <span className="text-red-500">*</span>
                                                                </Label>
                                                                <Input
                                                                    id={`label-${index}`}
                                                                    value={field.label}
                                                                    onChange={(e) =>
                                                                        updateField(index, { label: e.target.value })
                                                                    }
                                                                    placeholder={t('forms.fields.properties.labelPlaceholder') || 'Enter field label'}
                                                                    className="h-11 sm:h-10 text-sm"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`type-${index}`} className="text-sm font-medium">
                                                                    {t('forms.fields.properties.type')}
                                                                </Label>
                                                                <Select
                                                                    value={field.type}
                                                                    onValueChange={(value) => {
                                                                        const newField: Partial<FormField> = { type: value as 'text' | 'number' | 'email' | 'date' | 'select' | 'checkbox' | 'file' };
                                                                        if (value === 'select' && !field.options) {
                                                                            newField.options = [];
                                                                        }
                                                                        updateField(index, newField);
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="h-11 sm:h-10">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {fieldTypes.map((type) => (
                                                                            <SelectItem
                                                                                key={type.value}
                                                                                value={type.value}
                                                                            >
                                                                                {type.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor={`placeholder-${index}`} className="text-sm font-medium">
                                                                    {t('forms.fields.properties.placeholder')}
                                                                </Label>
                                                                <Input
                                                                    id={`placeholder-${index}`}
                                                                    value={field.placeholder}
                                                                    onChange={(e) =>
                                                                        updateField(index, { placeholder: e.target.value })
                                                                    }
                                                                    placeholder={t('forms.fields.properties.placeholderPlaceholder') || 'Enter placeholder text'}
                                                                    className="h-11 sm:h-10 text-sm"
                                                                />
                                                            </div>

                                                            {/* Dropdown Options - Enhanced mobile layout */}
                                                            {field.type === 'select' && (
                                                                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                                        <Label className="text-sm font-medium">{t('forms.fields.properties.dropdownOptions')}</Label>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => addOption(index)}
                                                                            className="h-9 w-full sm:w-auto"
                                                                        >
                                                                            <Plus className="h-3 w-3 mr-1" />
                                                                            {t('forms.fields.properties.addOption')}
                                                                        </Button>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        {(field.options || []).map((option, optionIndex) => (
                                                                            <div key={optionIndex} className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 bg-white border rounded flex items-center justify-center text-xs font-medium text-gray-500">
                                                                                    {optionIndex + 1}
                                                                                </div>
                                                                                <Input
                                                                                    value={option}
                                                                                    onChange={(e) =>
                                                                                        updateOption(index, optionIndex, e.target.value)
                                                                                    }
                                                                                    placeholder={t('forms.fields.properties.optionPlaceholder', { number: optionIndex + 1 })}
                                                                                    className="flex-1 h-10 text-sm"
                                                                                />
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => removeOption(index, optionIndex)}
                                                                                    className="h-10 w-10 p-0 text-gray-500 hover:text-red-600"
                                                                                >
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                        ))}
                                                                        {(!field.options || field.options.length === 0) && (
                                                                            <div className="text-center py-4">
                                                                                <p className="text-sm text-gray-500 mb-2">
                                                                                    {t('forms.fields.properties.noOptionsMessage')}
                                                                                </p>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => addOption(index)}
                                                                                    className="h-9"
                                                                                >
                                                                                    <Plus className="h-3 w-3 mr-1" />
                                                                                    {t('forms.fields.properties.addOption')}
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                                                <Checkbox
                                                                    id={`required-${index}`}
                                                                    checked={field.required}
                                                                    onCheckedChange={(checked) =>
                                                                        updateField(index, { required: !!checked })
                                                                    }
                                                                    className="h-5 w-5"
                                                                />
                                                                <Label htmlFor={`required-${index}`} className="text-sm font-medium cursor-pointer">
                                                                    {t('forms.fields.properties.required')}
                                                                </Label>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Submit Button - Always sticky across all devices */}
                        <div className="sticky bottom-0 bg-gray-50/80 backdrop-blur-sm border-0 p-4">
                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <Button 
                                    type="submit" 
                                    disabled={isLoading} 
                                    className="bg-blue-600 hover:bg-blue-700 h-11 sm:h-10 w-full sm:w-auto min-w-[140px]"
                                    size="lg"
                                >
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    {t('forms.update')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
