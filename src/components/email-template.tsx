import * as React from 'react';
import { getServerTranslation } from '@/lib/server-i18n';

interface EmailTemplateProps {
  formTitle: string;
  formDescription?: string;
  submissionData: Record<string, unknown>;
  submittedAt: string;
  language?: string;
  fields: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  fileMetadata?: Record<string, Array<{
    path: string;
    originalFileName: string;
  }>>;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  formTitle,
  formDescription,
  submissionData,
  submittedAt,
  language = 'zh-CN',
  fields,
  fileMetadata = {},
}) => {
  // Use the server-side translation utility with existing locale files
  const t = getServerTranslation(language);

  // Check if there are any file attachments
  const hasAttachments = fields.some(field => 
    field.type === 'file' && submissionData[field.id] && 
    Array.isArray(submissionData[field.id]) && 
    (submissionData[field.id] as string[]).length > 0
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
        {t('email.newSubmission')}: {formTitle}
      </h1>
      
      {formDescription && (
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          {formDescription}
        </p>
      )}
      
      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
        <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
          <strong>{t('email.submittedAt')}:</strong> {new Date(submittedAt).toLocaleString(language === 'zh-CN' ? 'zh-CN' : 'en-US')}
        </p>
      </div>

      {hasAttachments && (
        <div style={{ 
          backgroundColor: '#e7f3ff', 
          border: '1px solid #b3d9ff', 
          padding: '12px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: '0', fontSize: '14px', color: '#0066cc', fontWeight: 'bold' }}>
            📎 {t('email.attachmentsIncluded')}
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
            {t('email.attachmentsNote')}
          </p>
        </div>
      )}
      
      <h2 style={{ color: '#333', marginTop: '30px', marginBottom: '15px' }}>{t('email.submissionDetails')}</h2>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>{t('email.field')}</th>
            <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>{t('email.value')}</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const value = submissionData[field.id];
            let displayValue = '';
            
            if (value !== undefined && value !== null) {
              if (field.type === 'checkbox') {
                displayValue = value ? t('common.yes') : t('common.no');
              } else if (field.type === 'file') {
                if (Array.isArray(value) && value.length > 0) {
                  // Get original filenames from metadata
                  const fieldFiles = fileMetadata[field.id] || [];
                  const fileNames = fieldFiles.map(file => file.originalFileName);
                  
                  // If we don't have metadata for some reason, fall back to extracting from paths
                  if (fileNames.length === 0) {
                    const fallbackNames = value.map(filePath => {
                      const fileName = filePath.split('/').pop() || filePath;
                      // Remove timestamp and random string prefix if present
                      return fileName.replace(/^\d+_[a-z0-9]+_/, '');
                    });
                    displayValue = `📎 ${fallbackNames.join(', ')} (${value.length} ${value.length === 1 ? t('email.attachment') : t('email.attachments')})`;
                  } else {
                    displayValue = `📎 ${fileNames.join(', ')} (${value.length} ${value.length === 1 ? t('email.attachment') : t('email.attachments')})`;
                  }
                } else {
                  displayValue = t('email.noFiles');
                }
              } else {
                displayValue = String(value);
              }
            } else {
              displayValue = t('email.notProvided');
            }
            
            return (
              <tr key={field.id} style={{ backgroundColor: field.required && !value ? '#fff3cd' : 'white' }}>
                <td style={{ 
                  padding: '12px', 
                  border: '1px solid #ddd', 
                  fontWeight: 'bold',
                  verticalAlign: 'top'
                }}>
                  {field.label}
                  {field.required && <span style={{ color: '#dc3545' }}>*</span>}
                </td>
                <td style={{ 
                  padding: '12px', 
                  border: '1px solid #ddd',
                  wordBreak: 'break-word'
                }}>
                  {displayValue}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div style={{ 
        backgroundColor: '#e7f3ff', 
        border: '1px solid #b3d9ff', 
        padding: '15px', 
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
          {t('email.autoGenerated')}
        </p>
      </div>
    </div>
  );
};
