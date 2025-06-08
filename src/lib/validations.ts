import { z } from 'zod'

// Type for translation function
type TranslationFunction = (key: string, options?: Record<string, unknown>) => string

// Default English messages as fallback
const defaultMessages = {
  fieldLabelRequired: 'Label is required',
  titleRequired: 'Form title is required',
  titleTooLong: 'Title must be less than 100 characters',
  fieldsRequired: 'At least one field is required to create a form',
  emailInvalid: 'Please enter a valid email address'
}

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'number', 'email', 'date', 'select', 'checkbox', 'file']),
  label: z.string().min(1, defaultMessages.fieldLabelRequired),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  fileConstraints: z.object({
    maxSize: z.number().min(1).max(30), // Max 30MB
    allowedTypes: z.array(z.string())
  }).optional()
})

// Function to create form schema with i18n support
export const createFormSchemaWithI18n = (t?: TranslationFunction) => {
  const getMessage = (key: keyof typeof defaultMessages, fallback: string) => 
    t ? t(`validation.${key}`) : fallback

  return z.object({
    title: z.string()
      .min(1, getMessage('titleRequired', defaultMessages.titleRequired))
      .max(100, getMessage('titleTooLong', defaultMessages.titleTooLong)),
    description: z.string().optional(),
    fields: z.array(formFieldSchema.refine(
      (field) => field.label.trim().length > 0,
      { message: getMessage('fieldLabelRequired', defaultMessages.fieldLabelRequired) }
    )).min(1, getMessage('fieldsRequired', defaultMessages.fieldsRequired)),
    emailRecipient: z.string().email(getMessage('emailInvalid', defaultMessages.emailInvalid)),
    emailSubject: z.string().optional()
  })
}

// Default schema for backward compatibility
export const createFormSchema = createFormSchemaWithI18n()

export const submitFormSchema = z.object({
  formId: z.string().uuid(),
  data: z.record(z.any()),
  files: z.array(z.string()).optional()
})

export const createCommentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(2000, 'Content too long'),
  category: z.enum(['general', 'bug', 'feature', 'improvement', 'question']).default('general'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
})

export const updateCommentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  content: z.string().min(10, 'Content must be at least 10 characters').max(2000, 'Content too long').optional(),
  category: z.enum(['general', 'bug', 'feature', 'improvement', 'question']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional()
})

export type FormField = z.infer<typeof formFieldSchema>
export type CreateFormData = z.infer<typeof createFormSchema>
export type SubmitFormData = z.infer<typeof submitFormSchema>
export type CreateCommentData = z.infer<typeof createCommentSchema>
export type UpdateCommentData = z.infer<typeof updateCommentSchema>
