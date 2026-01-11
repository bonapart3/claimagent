# Security Policy

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email us at: **security@claimagent.io**

Include the following in your report:

1. **Description** - Clear description of the vulnerability
2. **Steps to Reproduce** - Detailed steps to reproduce the issue
3. **Impact** - Potential impact and severity assessment
4. **Affected Versions** - Which versions are affected
5. **Suggested Fix** - If you have one (optional)

### What to Expect

| Timeline | Action |
|----------|--------|
| 24 hours | Acknowledgment of your report |
| 72 hours | Initial assessment and severity rating |
| 7 days | Status update on remediation |
| 30 days | Target resolution for critical issues |
| 90 days | Target resolution for non-critical issues |

### Severity Ratings

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | Remote code execution, data breach | 24-48 hours |
| High | Authentication bypass, privilege escalation | 7 days |
| Medium | XSS, CSRF, information disclosure | 30 days |
| Low | Minor information leaks, best practice issues | 90 days |

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.x.x | ✅ Active support |
| 2.x.x | ⚠️ Security fixes only |
| < 2.0 | ❌ No longer supported |

## Security Measures

ClaimAgent implements the following security controls:

### Authentication & Authorization

- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- Session management with secure tokens
- Password policies (complexity, rotation)

### Data Protection

- AES-256 encryption at rest
- TLS 1.3 encryption in transit
- PII data masking in logs
- Secure key management

### Application Security

- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection (React, CSP headers)
- CSRF token validation
- Rate limiting and DDoS protection

### Infrastructure

- Regular security patching
- Network segmentation
- Intrusion detection
- Security monitoring and alerting

### Compliance

- SOC 2 Type II certified
- ISO 27001 compliant
- CCPA compliant
- GLBA compliant

## Security Best Practices for Users

### API Keys

- Never commit API keys to version control
- Rotate keys regularly
- Use environment variables
- Apply principle of least privilege

### Environment Variables

```bash
# Never do this
OPENAI_API_KEY=sk-1234567890abcdef

# Instead, use a secrets manager or secure .env
```

### Database

- Use strong, unique passwords
- Enable SSL connections
- Restrict network access
- Regular backups with encryption

## Bug Bounty Program

We currently do not have a formal bug bounty program. However, we recognize and appreciate security researchers who report vulnerabilities responsibly.

Valid reports may receive:
- Public acknowledgment (with permission)
- ClaimAgent swag
- Future consideration for bounty program

## Security Contacts

- **Security Team**: security@claimagent.io
- **Emergency Hotline**: 1-800-CLAIM-AI (for critical issues)
- **PGP Key**: Available upon request

## Changelog

| Date | Change |
|------|--------|
| 2026-01-11 | Initial security policy |

---

Thank you for helping keep ClaimAgent secure.
