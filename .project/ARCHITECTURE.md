# Foxus Code Architecture Documentation

This document outlines the complete architecture of Foxus Code (灵狐快码), including system design, security architecture, data flow, and component relationships.

## Table of Contents
- [System Overview](#system-overview)
- [Security Architecture](#security-architecture)
- [Data Flow](#data-flow)
- [Component Architecture](#component-architecture)
- [Database Schema](#database-schema)
- [API Architecture](#api-architecture)
- [Authentication Flow](#authentication-flow)
- [File Upload Architecture](#file-upload-architecture)
- [Email System](#email-system)
- [Deployment Architecture](#deployment-architecture)

## System Overview

Foxus Code is a modern full-stack web application built with Next.js 15 App Router, featuring form creation, QR code generation, and email-based form submissions with file attachments.

### Technology Stack
```
Frontend:
├── Next.js 15 (App Router)
├── React 18
├── TypeScript
├── Tailwind CSS
├── Shadcn UI
├── React-i18next (Internationalization)
└── Zod (Validation)

Backend:
├── Next.js API Routes
├── Supabase (Database & Auth)
├── Resend (Email Service)
└── Node.js Runtime

Infrastructure:
├── Vercel (Hosting)
├── Supabase (BaaS)
├── Cloudflare (CDN - via Vercel)
└── GitHub (Version Control)
```

## Security Architecture

The application implements a comprehensive security model with multiple layers of protection:

### Authentication Security Flow

```mermaid
graph TB
    A[User Access] --> B{Route Type?}
    
    B -->|Protected Routes<br/>/dashboard, /forms| C[Middleware Auth Check]
    B -->|Auth Routes<br/>/auth/signin, /auth/signup| D[Already Authenticated?]
    B -->|Public Routes<br/>/, /submit| E[Allow Access]
    B -->|Auth Flow Routes<br/>/auth/confirm, /auth/success| F[Special Handling]
    
    C -->|No User Session| G[Redirect to /auth/signin]
    C -->|Valid User Session| H[Allow Access + Security Headers]
    
    D -->|Yes| I[Redirect to /dashboard]
    D -->|No| J[Allow Access to Auth Pages]
    
    F --> K{Which Route?}
    K -->|/auth/confirm| L[Rate Limiting + Validation]
    K -->|/auth/success| M[Client-side Auth Check]
    K -->|/auth/auth-code-error| N[Legitimacy Validation]
    
    L --> O[Valid Token?]
    O -->|Yes| P[Verify OTP]
    O -->|No| Q[Redirect to Error Page]
    
    P -->|Success| R[Redirect to /auth/success]
    P -->|Failed| Q
    
    M --> S[Is User Authenticated?]
    S -->|Yes| T[Show Success Page]
    S -->|No| U[Redirect to /auth/signin]
    
    N --> V[Has Valid Error Context?]
    V -->|Yes| W[Show Error Page]
    V -->|No| X[Redirect to Home]
    
    style G fill:#ffcccc
    style Q fill:#ffcccc
    style U fill:#ffcccc
    style X fill:#ffcccc
    style H fill:#ccffcc
    style T fill:#ccffcc
    style W fill:#fff3cd
```

### Security Layers

1. **Middleware Security**
   - Route protection based on authentication status
   - Security headers (CSP, X-Frame-Options, etc.)
   - Rate limiting for sensitive endpoints
   - Request logging for security monitoring

2. **Authentication Security**
   - Server-side session validation
   - Client-side auth state management
   - Automatic redirects for unauthorized access
   - Token validation with format checking

3. **Page-Level Security**
   - Auth confirmation route with rate limiting
   - Success page with authentication validation
   - Error page with legitimacy checks
   - Input sanitization and validation

### Security Headers

```typescript
// Applied by middleware to all responses
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    frame-ancestors 'none';
  `
}
```

## Data Flow

### Form Creation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant DB as Supabase
    participant S as Storage
    
    U->>F: Create Form
    F->>F: Validate Input (Zod)
    F->>A: POST /api/forms
    A->>A: Authenticate User
    A->>DB: Insert Form
    DB-->>A: Form Created
    A-->>F: Success Response
    F->>F: Generate QR Code
    F-->>U: Display Form + QR
```

### Form Submission Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant S as Storage
    participant DB as Supabase
    participant E as Email Service
    
    U->>F: Submit Form
    F->>F: Validate Data
    
    alt Has Files
        F->>A: Request Upload URLs
        A->>S: Generate Signed URLs
        S-->>A: Upload URLs
        A-->>F: Return URLs
        F->>S: Upload Files
        S-->>F: Upload Complete
    end
    
    F->>A: POST /api/submit
    A->>DB: Store Submission
    A->>E: Send Email
    E-->>A: Email Sent
    A-->>F: Success
    F-->>U: Confirmation
```

## Component Architecture

### Frontend Components Hierarchy

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
│   │   ├── signin/        # Sign in page
│   │   ├── signup/        # Sign up page
│   │   ├── confirm/       # Email confirmation handler
│   │   ├── success/       # Auth success page
│   │   └── auth-code-error/ # Auth error page
│   ├── api/               # API routes
│   │   ├── forms/         # Form CRUD operations
│   │   ├── submit/        # Form submission handler
│   │   ├── storage/       # File upload utilities
│   │   └── auth/          # Authentication endpoints
│   ├── dashboard/         # Protected dashboard
│   ├── forms/             # Form management
│   │   ├── create/        # Form creation
│   │   ├── edit/[id]/     # Form editing
│   │   └── [id]/          # Form details
│   └── submit/[id]/       # Public form submission
├── components/            # Reusable components
│   ├── ui/               # Shadcn UI components
│   ├── forms/            # Form-related components
│   ├── auth/             # Authentication components
│   └── layout/           # Layout components
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Supabase client
│   ├── auth.ts           # Auth utilities
│   ├── validations.ts    # Zod schemas
│   └── i18n.ts           # Internationalization
└── types/                # TypeScript definitions
```

### Core Components

1. **Form Builder**
   - Drag-and-drop interface
   - Field type selection
   - Validation rules
   - Preview functionality

2. **QR Code Generator**
   - Dynamic QR code generation
   - Customizable styling
   - Download functionality

3. **File Upload System**
   - Signed URL generation
   - Progress tracking
   - Multiple file support
   - Type validation

4. **Email System**
   - Template-based emails
   - Attachment handling
   - Internationalization support

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    users {
        uuid id PK
        text email UK
        text name
        text avatar_url
        timestamp created_at
        timestamp updated_at
    }
    
    forms {
        uuid id PK
        uuid user_id FK
        text title
        text description
        jsonb fields
        text email_recipient
        text email_subject
        timestamp created_at
        timestamp updated_at
        boolean is_active
    }
    
    submissions {
        uuid id PK
        uuid form_id FK
        jsonb data
        text[] files
        timestamp created_at
        text ip_address
    }
    
    users ||--o{ forms : "owns"
    forms ||--o{ submissions : "receives"
```

### Data Types and Constraints

```sql
-- Form fields structure (JSONB)
{
  "id": "field_uuid",
  "type": "text|email|number|select|file|textarea",
  "label": "Field Label",
  "required": true|false,
  "options": ["option1", "option2"], -- for select fields
  "validation": {
    "min": 0,
    "max": 100,
    "pattern": "regex_pattern"
  }
}

-- Submission data structure (JSONB)
{
  "field_id": "submitted_value",
  "file_field_id": [
    {
      "name": "filename.pdf",
      "url": "storage_url",
      "size": 12345,
      "type": "application/pdf"
    }
  ]
}
```

## API Architecture

### RESTful API Endpoints

```
Authentication:
├── GET  /auth/confirm           # Email confirmation
├── POST /api/auth/signout      # Sign out

Forms:
├── GET    /api/forms           # List user forms
├── POST   /api/forms           # Create form
├── GET    /api/forms/[id]      # Get form details
├── PUT    /api/forms/[id]      # Update form
└── DELETE /api/forms/[id]      # Delete form

Submissions:
├── POST /api/submit            # Submit form
└── GET  /api/forms/[id]/submissions # Get form submissions

Storage:
├── POST /api/storage/upload-url # Get signed upload URL
└── GET  /api/storage/[file]    # Download file
```

### API Security

1. **Authentication**
   - Supabase JWT tokens
   - Row Level Security (RLS)
   - User session validation

2. **Authorization**
   - User-specific data access
   - Form ownership validation
   - Admin-only endpoints

3. **Input Validation**
   - Zod schema validation
   - File type restrictions
   - Size limitations

## Authentication Flow

### Complete Auth Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant M as Middleware
    participant S as Supabase
    participant E as Email
    
    U->>F: Sign Up
    F->>S: Create Account
    S->>E: Send Confirmation Email
    E->>U: Email with Confirm Link
    
    U->>F: Click Confirm Link
    F->>M: Route to /auth/confirm
    M->>M: Apply Rate Limiting
    M->>S: Verify OTP Token
    S-->>M: Verification Result
    
    alt Success
        M->>F: Redirect to /auth/success
        F->>F: Check Authentication
        F->>S: Verify Session
        S-->>F: Session Valid
        F-->>U: Show Success Page
    else Failed
        M->>F: Redirect to /auth/auth-code-error
        F->>F: Validate Error Context
        F-->>U: Show Error Page
    end
```

### Session Management

1. **Server-Side**
   - Supabase handles JWT tokens
   - Automatic token refresh
   - Secure cookie storage

2. **Client-Side**
   - React context for auth state
   - Automatic redirects
   - Loading states

## File Upload Architecture

### Signed URL Upload Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant S as Supabase Storage
    participant E as Email Service
    
    C->>A: Request Upload URL
    A->>A: Validate File Type/Size
    A->>S: Generate Signed URL
    S-->>A: Return Signed URL
    A-->>C: Upload URL + Path
    
    C->>S: Upload File Directly
    S-->>C: Upload Success
    
    C->>A: Submit Form with File Paths
    A->>A: Process Submission
    A->>E: Send Email with Attachments
```

### File Storage Strategy

1. **Storage Structure**
   ```
   supabase-storage/
   ├── form-files/
   │   ├── form-attachments/
   │   │   ├── timestamp_random_filename.ext
   │   │   └── ...
   │   └── profile-images/
   │       ├── user_id/
   │       └── ...
   ```

2. **Security Measures**
   - Filename sanitization
   - File type validation
   - Size limitations
   - Virus scanning (future)

## Email System

### Email Architecture

```mermaid
graph LR
    A[Form Submission] --> B[API Handler]
    B --> C[Generate Email]
    C --> D[Attach Files]
    D --> E[Send via Resend]
    E --> F[Delivery]
    
    C --> G[Template Selection]
    G --> H[i18n Translation]
    H --> C
    
    D --> I[Download from Supabase]
    I --> J[Attach to Email]
    J --> D
```

### Email Templates

1. **Form Submission Email**
   - Dynamic content based on form fields
   - File attachments
   - Multilingual support

2. **System Emails**
   - Welcome emails
   - Password reset
   - Account notifications

## Deployment Architecture

### Production Infrastructure

```mermaid
graph TB
    U[Users] --> CF[Cloudflare CDN]
    CF --> V[Vercel Edge Network]
    V --> A[Next.js App]
    
    A --> S[Supabase]
    A --> R[Resend API]
    A --> ST[Supabase Storage]
    
    S --> PG[PostgreSQL]
    S --> AU[Auth Service]
    
    subgraph "Monitoring"
        M[Vercel Analytics]
        L[Vercel Logs]
        E[Error Tracking]
    end
    
    A --> M
    A --> L
    A --> E
```

### Environment Configuration

1. **Development**
   - Local Next.js server
   - Supabase development project
   - Local file storage

2. **Production**
   - Vercel hosting
   - Supabase production project
   - CDN for static assets

### Scaling Considerations

1. **Database Scaling**
   - Read replicas for heavy queries
   - Connection pooling
   - Query optimization

2. **Application Scaling**
   - Serverless functions auto-scale
   - CDN for static content
   - Image optimization

3. **Storage Scaling**
   - Supabase storage auto-scales
   - File compression
   - CDN integration

## Performance Optimization

### Frontend Optimizations

1. **Code Splitting**
   - Route-based splitting
   - Component lazy loading
   - Dynamic imports

2. **Caching Strategy**
   - Browser caching
   - CDN caching
   - API response caching

3. **Bundle Optimization**
   - Tree shaking
   - Minification
   - Compression

### Backend Optimizations

1. **Database**
   - Proper indexing
   - Query optimization
   - Connection pooling

2. **API Performance**
   - Response compression
   - Efficient serialization
   - Pagination

## Security Best Practices

### Application Security

1. **Authentication & Authorization**
   - Multi-factor authentication support
   - Role-based access control
   - Session timeout

2. **Data Protection**
   - Encryption at rest
   - Encryption in transit
   - PII data handling

3. **Infrastructure Security**
   - Security headers
   - HTTPS enforcement
   - Regular security updates

### Compliance Considerations

1. **Data Privacy**
   - GDPR compliance
   - Data retention policies
   - User data export/deletion

2. **Security Monitoring**
   - Access logging
   - Anomaly detection
   - Security incident response

## Monitoring and Observability

### Application Monitoring

1. **Performance Metrics**
   - Page load times
   - API response times
   - Error rates

2. **User Analytics**
   - User behavior tracking
   - Conversion funnels
   - Feature usage

3. **System Health**
   - Server uptime
   - Database performance
   - Third-party service status

### Alerting Strategy

1. **Critical Alerts**
   - Application downtime
   - High error rates
   - Security incidents

2. **Warning Alerts**
   - Performance degradation
   - Resource utilization
   - Failed email deliveries

## Future Architecture Considerations

### Planned Enhancements

1. **Microservices Migration**
   - Email service extraction
   - File processing service
   - Analytics service

2. **Advanced Features**
   - Real-time form collaboration
   - Advanced analytics
   - Form versioning

3. **Scalability Improvements**
   - Caching layer
   - Message queues
   - Load balancing

### Technology Evolution

1. **Framework Updates**
   - Next.js feature adoption
   - React 19 features
   - TypeScript improvements

2. **Infrastructure Modernization**
   - Container orchestration
   - Service mesh
   - Observability improvements

---

## Contributing to Architecture

When making architectural changes:

1. **Documentation Updates**
   - Update this document
   - Update code comments
   - Update API documentation

2. **Security Reviews**
   - Security impact assessment
   - Code security review
   - Penetration testing

3. **Performance Testing**
   - Load testing
   - Performance benchmarking
   - Scalability testing

For questions about the architecture or proposed changes, please create an issue or start a discussion in the repository.
