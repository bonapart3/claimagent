/**
 * ClaimAgent™ UI Request Handler
 *
 * Handles serving the Next.js application UI through Cloudflare Workers
 */

import type { Env } from './index';

// HTML templates for the UI
const templates = {
  shell: generateAppShell,
  dashboard: generateDashboardPage,
  newClaim: generateNewClaimPage,
  claimDetails: generateClaimDetailsPage,
  login: generateLoginPage,
  notFound: generate404Page,
};

/**
 * Handle UI requests and serve appropriate pages
 */
export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Try to get cached response first
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;

  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  // Route to appropriate page
  let html: string;
  let status = 200;

  switch (true) {
    case path === '/' || path === '/claims/dashboard':
      html = templates.dashboard(env);
      break;

    case path === '/claims/new':
      html = templates.newClaim(env);
      break;

    case path.match(/^\/claims\/[a-zA-Z0-9-]+$/) !== null:
      html = templates.claimDetails(env, path.split('/').pop() || '');
      break;

    case path === '/login':
      html = templates.login(env);
      break;

    default:
      html = templates.notFound(env);
      status = 404;
  }

  response = new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-cache',
    },
  });

  // Cache successful responses
  if (status === 200) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

/**
 * Generate the application shell with common layout
 */
function generateAppShell(content: string, title: string, env: Env): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="AI-powered automotive insurance claims processing with 50-state compliance, fraud detection, and automated decision routing.">
  <title>${title} - ${env.APP_NAME}</title>
  <link rel="icon" href="/logo.svg" type="image/svg+xml">
  <meta name="theme-color" content="#1e3a8a">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --primary: #1e3a8a;
      --primary-light: #3b82f6;
      --secondary: #64748b;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --background: #f8fafc;
      --surface: #ffffff;
      --text: #1e293b;
      --text-muted: #64748b;
      --border: #e2e8f0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: var(--background);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
    }

    /* Header Styles */
    .header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-content {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 1.5rem;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-icon svg {
      width: 24px;
      height: 24px;
      fill: white;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary);
    }

    .nav {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .nav-link {
      color: var(--text-muted);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }

    .nav-link:hover, .nav-link.active {
      color: var(--primary);
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-left: 1.5rem;
      border-left: 1px solid var(--border);
    }

    .avatar {
      width: 36px;
      height: 36px;
      background: var(--primary-light);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
    }

    /* Main Content */
    .main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    /* Card Styles */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
    }

    /* Button Styles */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      border: none;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-light);
    }

    .btn-secondary {
      background: var(--background);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--border);
    }

    /* Badge Styles */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #dbeafe; color: #1e40af; }

    /* Grid Layout */
    .grid {
      display: grid;
      gap: 1.5rem;
    }

    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }

    @media (max-width: 768px) {
      .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
      .nav { display: none; }
    }

    /* Stat Card */
    .stat-card {
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    /* Table Styles */
    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table th, .table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .table th {
      font-weight: 600;
      color: var(--text-muted);
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .table tr:hover td {
      background: var(--background);
    }

    /* Form Styles */
    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: var(--text);
    }

    .form-input {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
    }

    .form-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
      background-position: right 0.5rem center;
      background-repeat: no-repeat;
      background-size: 1.5em 1.5em;
      padding-right: 2.5rem;
    }

    /* Footer */
    .footer {
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding: 1.5rem;
      margin-top: auto;
    }

    .footer-content {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .footer-links {
      display: flex;
      gap: 1.5rem;
    }

    .footer-links a {
      color: var(--text-muted);
      text-decoration: none;
    }

    .footer-links a:hover {
      color: var(--primary);
    }

    /* Loading Spinner */
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      padding: 1rem 1.5rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-content">
      <a href="/" class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span class="logo-text">${env.APP_NAME}</span>
      </a>

      <nav class="nav">
        <a href="/claims/dashboard" class="nav-link">Dashboard</a>
        <a href="/claims/new" class="nav-link">New Claim</a>
        <a href="/admin" class="nav-link">Admin</a>

        <div class="user-menu">
          <div class="avatar">U</div>
        </div>
      </nav>
    </div>
  </header>

  <main class="main">
    ${content}
  </main>

  <footer class="footer">
    <div class="footer-content">
      <div>&copy; ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved. | 50-State Certified | CCPA & GLBA Compliant</div>
      <div class="footer-links">
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/compliance">Compliance</a>
      </div>
    </div>
  </footer>

  <script>
    // Client-side hydration and interactivity
    document.addEventListener('DOMContentLoaded', function() {
      // Mark active navigation link
      const currentPath = window.location.pathname;
      document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
          link.classList.add('active');
        }
      });

      // Add form validation
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());

          try {
            const response = await fetch(form.action, {
              method: form.method || 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });

            if (response.ok) {
              showToast('Success!', 'success');
              if (form.dataset.redirect) {
                window.location.href = form.dataset.redirect;
              }
            } else {
              throw new Error('Request failed');
            }
          } catch (error) {
            showToast('An error occurred. Please try again.', 'error');
          }
        });
      });
    });

    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = '<span>' + message + '</span>';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 3000);
    }
  </script>
</body>
</html>`;
}

/**
 * Generate Dashboard page
 */
function generateDashboardPage(env: Env): string {
  const content = `
    <div class="page-header" style="margin-bottom: 2rem;">
      <h1 style="font-size: 1.75rem; font-weight: 700;">Claims Dashboard</h1>
      <p style="color: var(--text-muted); margin-top: 0.5rem;">Monitor and manage insurance claims in real-time</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-4" style="margin-bottom: 2rem;">
      <div class="card stat-card">
        <div class="stat-value" id="total-claims">247</div>
        <div class="stat-label">Total Claims</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value" style="color: var(--warning);" id="pending-claims">34</div>
        <div class="stat-label">Pending Review</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value" style="color: var(--success);" id="approved-claims">189</div>
        <div class="stat-label">Approved</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value" style="color: var(--danger);" id="fraud-alerts">12</div>
        <div class="stat-label">Fraud Alerts</div>
      </div>
    </div>

    <!-- Recent Claims -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Recent Claims</h2>
        <a href="/claims/new" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Claim
        </a>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Claim ID</th>
            <th>Policyholder</th>
            <th>Type</th>
            <th>Date Filed</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="claims-table-body">
          <tr>
            <td><a href="/claims/CLM-2024-001" style="color: var(--primary); text-decoration: none;">CLM-2024-001</a></td>
            <td>John Smith</td>
            <td>Collision</td>
            <td>Jan 10, 2024</td>
            <td><span class="badge badge-warning">Under Review</span></td>
            <td>$4,250.00</td>
            <td>
              <a href="/claims/CLM-2024-001" class="btn btn-secondary" style="padding: 0.375rem 0.75rem;">View</a>
            </td>
          </tr>
          <tr>
            <td><a href="/claims/CLM-2024-002" style="color: var(--primary); text-decoration: none;">CLM-2024-002</a></td>
            <td>Sarah Johnson</td>
            <td>Comprehensive</td>
            <td>Jan 9, 2024</td>
            <td><span class="badge badge-success">Approved</span></td>
            <td>$1,875.00</td>
            <td>
              <a href="/claims/CLM-2024-002" class="btn btn-secondary" style="padding: 0.375rem 0.75rem;">View</a>
            </td>
          </tr>
          <tr>
            <td><a href="/claims/CLM-2024-003" style="color: var(--primary); text-decoration: none;">CLM-2024-003</a></td>
            <td>Mike Davis</td>
            <td>Liability</td>
            <td>Jan 8, 2024</td>
            <td><span class="badge badge-danger">Flagged</span></td>
            <td>$12,500.00</td>
            <td>
              <a href="/claims/CLM-2024-003" class="btn btn-secondary" style="padding: 0.375rem 0.75rem;">View</a>
            </td>
          </tr>
          <tr>
            <td><a href="/claims/CLM-2024-004" style="color: var(--primary); text-decoration: none;">CLM-2024-004</a></td>
            <td>Emily Chen</td>
            <td>Collision</td>
            <td>Jan 7, 2024</td>
            <td><span class="badge badge-info">Processing</span></td>
            <td>$3,100.00</td>
            <td>
              <a href="/claims/CLM-2024-004" class="btn btn-secondary" style="padding: 0.375rem 0.75rem;">View</a>
            </td>
          </tr>
          <tr>
            <td><a href="/claims/CLM-2024-005" style="color: var(--primary); text-decoration: none;">CLM-2024-005</a></td>
            <td>Robert Wilson</td>
            <td>Theft</td>
            <td>Jan 6, 2024</td>
            <td><span class="badge badge-success">Settled</span></td>
            <td>$18,750.00</td>
            <td>
              <a href="/claims/CLM-2024-005" class="btn btn-secondary" style="padding: 0.375rem 0.75rem;">View</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- AI Processing Status -->
    <div class="grid grid-2">
      <div class="card">
        <h2 class="card-title" style="margin-bottom: 1rem;">AI Processing Queue</h2>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--background); border-radius: 8px;">
            <span>Document Analysis</span>
            <span class="badge badge-info">3 in queue</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--background); border-radius: 8px;">
            <span>Fraud Detection</span>
            <span class="badge badge-warning">5 processing</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--background); border-radius: 8px;">
            <span>Valuation Engine</span>
            <span class="badge badge-success">Complete</span>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title" style="margin-bottom: 1rem;">System Status</h2>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>API Gateway</span>
            <span style="color: var(--success);">● Operational</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>Database</span>
            <span style="color: var(--success);">● Operational</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>AI Services</span>
            <span style="color: var(--success);">● Operational</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>Document Storage</span>
            <span style="color: var(--success);">● Operational</span>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Fetch live claims data
      async function loadClaimsData() {
        try {
          const response = await fetch('/api/claims/stats');
          if (response.ok) {
            const data = await response.json();
            document.getElementById('total-claims').textContent = data.total || '0';
            document.getElementById('pending-claims').textContent = data.pending || '0';
            document.getElementById('approved-claims').textContent = data.approved || '0';
            document.getElementById('fraud-alerts').textContent = data.fraudAlerts || '0';
          }
        } catch (error) {
          console.log('Using cached data');
        }
      }

      loadClaimsData();
      setInterval(loadClaimsData, 30000); // Refresh every 30 seconds
    </script>
  `;

  return generateAppShell(content, 'Dashboard', env);
}

/**
 * Generate New Claim page
 */
function generateNewClaimPage(env: Env): string {
  const content = `
    <div class="page-header" style="margin-bottom: 2rem;">
      <h1 style="font-size: 1.75rem; font-weight: 700;">File a New Claim</h1>
      <p style="color: var(--text-muted); margin-top: 0.5rem;">Submit your insurance claim for processing</p>
    </div>

    <div class="card" style="max-width: 800px;">
      <form action="/api/claims/submit" method="POST" data-redirect="/claims/dashboard">
        <!-- Policyholder Information -->
        <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--primary);">Policyholder Information</h3>

        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label" for="policyNumber">Policy Number *</label>
            <input type="text" id="policyNumber" name="policyNumber" class="form-input" placeholder="POL-XXXX-XXXX" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="claimantName">Claimant Name *</label>
            <input type="text" id="claimantName" name="claimantName" class="form-input" placeholder="Full legal name" required>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label" for="email">Email Address *</label>
            <input type="email" id="email" name="email" class="form-input" placeholder="email@example.com" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="phone">Phone Number *</label>
            <input type="tel" id="phone" name="phone" class="form-input" placeholder="(555) 123-4567" required>
          </div>
        </div>

        <!-- Incident Details -->
        <h3 style="font-size: 1rem; font-weight: 600; margin: 1.5rem 0 1rem; color: var(--primary);">Incident Details</h3>

        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label" for="incidentDate">Incident Date *</label>
            <input type="date" id="incidentDate" name="incidentDate" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="incidentTime">Incident Time</label>
            <input type="time" id="incidentTime" name="incidentTime" class="form-input">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="incidentLocation">Incident Location *</label>
          <input type="text" id="incidentLocation" name="incidentLocation" class="form-input" placeholder="Street address, city, state" required>
        </div>

        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label" for="claimType">Claim Type *</label>
            <select id="claimType" name="claimType" class="form-input form-select" required>
              <option value="">Select claim type</option>
              <option value="collision">Collision</option>
              <option value="comprehensive">Comprehensive</option>
              <option value="liability">Liability</option>
              <option value="medical">Medical Payments</option>
              <option value="uninsured">Uninsured Motorist</option>
              <option value="theft">Theft</option>
              <option value="vandalism">Vandalism</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="estimatedDamage">Estimated Damage Amount</label>
            <input type="number" id="estimatedDamage" name="estimatedDamage" class="form-input" placeholder="$0.00" min="0" step="0.01">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="description">Description of Incident *</label>
          <textarea id="description" name="description" class="form-input" rows="4" placeholder="Please provide a detailed description of what happened..." required style="resize: vertical;"></textarea>
        </div>

        <!-- Vehicle Information -->
        <h3 style="font-size: 1rem; font-weight: 600; margin: 1.5rem 0 1rem; color: var(--primary);">Vehicle Information</h3>

        <div class="grid grid-3">
          <div class="form-group">
            <label class="form-label" for="vehicleYear">Year *</label>
            <input type="number" id="vehicleYear" name="vehicleYear" class="form-input" placeholder="2024" min="1900" max="2025" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="vehicleMake">Make *</label>
            <input type="text" id="vehicleMake" name="vehicleMake" class="form-input" placeholder="Toyota" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="vehicleModel">Model *</label>
            <input type="text" id="vehicleModel" name="vehicleModel" class="form-input" placeholder="Camry" required>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label" for="vin">VIN</label>
            <input type="text" id="vin" name="vin" class="form-input" placeholder="17-character VIN" maxlength="17">
          </div>
          <div class="form-group">
            <label class="form-label" for="licensePlate">License Plate</label>
            <input type="text" id="licensePlate" name="licensePlate" class="form-input" placeholder="ABC-1234">
          </div>
        </div>

        <!-- Document Upload -->
        <h3 style="font-size: 1rem; font-weight: 600; margin: 1.5rem 0 1rem; color: var(--primary);">Supporting Documents</h3>

        <div class="form-group">
          <div style="border: 2px dashed var(--border); border-radius: 8px; padding: 2rem; text-align: center; cursor: pointer; transition: border-color 0.2s;" id="dropzone">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin: 0 auto 1rem;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Drag and drop files here, or click to browse</p>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Supports: PDF, JPG, PNG (max 10MB each)</p>
            <input type="file" id="documents" name="documents" multiple accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
          </div>
          <div id="file-list" style="margin-top: 1rem;"></div>
        </div>

        <!-- Submit -->
        <div style="display: flex; gap: 1rem; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
          <button type="submit" class="btn btn-primary" style="flex: 1;">
            Submit Claim
          </button>
          <a href="/claims/dashboard" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>

    <script>
      const dropzone = document.getElementById('dropzone');
      const fileInput = document.getElementById('documents');
      const fileList = document.getElementById('file-list');

      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary)';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border)';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border)';
        handleFiles(e.dataTransfer.files);
      });

      fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
      });

      function handleFiles(files) {
        fileList.innerHTML = '';
        Array.from(files).forEach(file => {
          const item = document.createElement('div');
          item.style.cssText = 'display: flex; justify-content: space-between; padding: 0.5rem; background: var(--background); border-radius: 4px; margin-bottom: 0.5rem;';
          item.innerHTML = '<span>' + file.name + '</span><span style="color: var(--text-muted);">' + (file.size / 1024).toFixed(1) + ' KB</span>';
          fileList.appendChild(item);
        });
      }
    </script>
  `;

  return generateAppShell(content, 'New Claim', env);
}

/**
 * Generate Claim Details page
 */
function generateClaimDetailsPage(env: Env, claimId: string): string {
  const content = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <div>
        <a href="/claims/dashboard" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">&larr; Back to Dashboard</a>
        <h1 style="font-size: 1.75rem; font-weight: 700; margin-top: 0.5rem;">Claim ${claimId}</h1>
      </div>
      <div style="display: flex; gap: 0.75rem;">
        <button class="btn btn-secondary">Download PDF</button>
        <button class="btn btn-primary">Process Claim</button>
      </div>
    </div>

    <!-- Status Timeline -->
    <div class="card">
      <h2 class="card-title" style="margin-bottom: 1.5rem;">Claim Timeline</h2>
      <div style="display: flex; gap: 0.5rem;">
        <div style="flex: 1; text-align: center;">
          <div style="width: 32px; height: 32px; background: var(--success); border-radius: 50%; margin: 0 auto 0.5rem; display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div style="font-weight: 500;">Submitted</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Jan 10, 2024</div>
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="width: 32px; height: 32px; background: var(--success); border-radius: 50%; margin: 0 auto 0.5rem; display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div style="font-weight: 500;">Verified</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Jan 10, 2024</div>
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="width: 32px; height: 32px; background: var(--warning); border-radius: 50%; margin: 0 auto 0.5rem; display: flex; align-items: center; justify-content: center;">
            <div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
          </div>
          <div style="font-weight: 500;">Under Review</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">In Progress</div>
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="width: 32px; height: 32px; background: var(--border); border-radius: 50%; margin: 0 auto 0.5rem;"></div>
          <div style="font-weight: 500; color: var(--text-muted);">Approved</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Pending</div>
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="width: 32px; height: 32px; background: var(--border); border-radius: 50%; margin: 0 auto 0.5rem;"></div>
          <div style="font-weight: 500; color: var(--text-muted);">Settled</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Pending</div>
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <!-- Claim Details -->
      <div class="card">
        <h2 class="card-title" style="margin-bottom: 1rem;">Claim Information</h2>
        <dl style="display: grid; grid-template-columns: 140px 1fr; gap: 0.75rem;">
          <dt style="color: var(--text-muted);">Status</dt>
          <dd><span class="badge badge-warning">Under Review</span></dd>

          <dt style="color: var(--text-muted);">Type</dt>
          <dd>Collision</dd>

          <dt style="color: var(--text-muted);">Incident Date</dt>
          <dd>January 10, 2024</dd>

          <dt style="color: var(--text-muted);">Location</dt>
          <dd>123 Main St, Los Angeles, CA 90001</dd>

          <dt style="color: var(--text-muted);">Estimated Amount</dt>
          <dd style="font-weight: 600;">$4,250.00</dd>

          <dt style="color: var(--text-muted);">Deductible</dt>
          <dd>$500.00</dd>
        </dl>
      </div>

      <!-- Policyholder Info -->
      <div class="card">
        <h2 class="card-title" style="margin-bottom: 1rem;">Policyholder</h2>
        <dl style="display: grid; grid-template-columns: 140px 1fr; gap: 0.75rem;">
          <dt style="color: var(--text-muted);">Name</dt>
          <dd>John Smith</dd>

          <dt style="color: var(--text-muted);">Policy Number</dt>
          <dd>POL-2024-123456</dd>

          <dt style="color: var(--text-muted);">Email</dt>
          <dd>john.smith@email.com</dd>

          <dt style="color: var(--text-muted);">Phone</dt>
          <dd>(555) 123-4567</dd>

          <dt style="color: var(--text-muted);">Coverage</dt>
          <dd>Full Coverage - Premium</dd>
        </dl>
      </div>
    </div>

    <!-- Vehicle & Documents -->
    <div class="grid grid-2">
      <div class="card">
        <h2 class="card-title" style="margin-bottom: 1rem;">Vehicle Information</h2>
        <dl style="display: grid; grid-template-columns: 140px 1fr; gap: 0.75rem;">
          <dt style="color: var(--text-muted);">Vehicle</dt>
          <dd>2022 Toyota Camry SE</dd>

          <dt style="color: var(--text-muted);">VIN</dt>
          <dd>4T1BF1FK5CU123456</dd>

          <dt style="color: var(--text-muted);">License Plate</dt>
          <dd>ABC-1234</dd>

          <dt style="color: var(--text-muted);">Mileage</dt>
          <dd>32,450 miles</dd>
        </dl>
      </div>

      <div class="card">
        <h2 class="card-title" style="margin-bottom: 1rem;">Documents</h2>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <a href="#" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--background); border-radius: 8px; text-decoration: none; color: var(--text);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>Police_Report.pdf</span>
          </a>
          <a href="#" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--background); border-radius: 8px; text-decoration: none; color: var(--text);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span>Damage_Photos.zip</span>
          </a>
          <a href="#" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--background); border-radius: 8px; text-decoration: none; color: var(--text);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>Repair_Estimate.pdf</span>
          </a>
        </div>
      </div>
    </div>

    <!-- AI Analysis -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">AI Analysis</h2>
        <span class="badge badge-info">Processing</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
        <div style="padding: 1rem; background: var(--background); border-radius: 8px;">
          <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">Fraud Risk Score</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">Low (12%)</div>
        </div>
        <div style="padding: 1rem; background: var(--background); border-radius: 8px;">
          <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">Document Verification</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">Verified</div>
        </div>
        <div style="padding: 1rem; background: var(--background); border-radius: 8px;">
          <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">AI Recommendation</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">Approve</div>
        </div>
      </div>
    </div>
  `;

  return generateAppShell(content, `Claim ${claimId}`, env);
}

/**
 * Generate Login page
 */
function generateLoginPage(env: Env): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - ${env.APP_NAME}</title>
  <link rel="icon" href="/logo.svg" type="image/svg+xml">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .login-card {
      background: white;
      padding: 2.5rem;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      width: 100%;
      max-width: 400px;
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-icon svg { width: 28px; height: 28px; fill: white; }
    .logo-text { font-size: 1.5rem; font-weight: 700; color: #1e3a8a; }
    h1 { text-align: center; margin-bottom: 0.5rem; color: #1e293b; }
    .subtitle { text-align: center; color: #64748b; margin-bottom: 2rem; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; font-weight: 500; margin-bottom: 0.5rem; color: #1e293b; }
    input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    button {
      width: 100%;
      padding: 0.875rem;
      background: #1e3a8a;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #3b82f6; }
    .divider {
      display: flex;
      align-items: center;
      margin: 1.5rem 0;
      color: #64748b;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-top: 1px solid #e2e8f0;
    }
    .divider span { padding: 0 1rem; font-size: 0.875rem; }
    .sso-btn {
      width: 100%;
      padding: 0.75rem;
      background: #f8fafc;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: background 0.2s;
    }
    .sso-btn:hover { background: #e2e8f0; }
    .footer { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; color: #64748b; }
    .footer a { color: #3b82f6; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span class="logo-text">${env.APP_NAME}</span>
    </div>

    <h1>Welcome back</h1>
    <p class="subtitle">Sign in to your account to continue</p>

    <form action="/api/auth/login" method="POST" data-redirect="/claims/dashboard">
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" placeholder="you@company.com" required>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="Enter your password" required>
      </div>

      <button type="submit">Sign In</button>
    </form>

    <div class="divider"><span>or continue with</span></div>

    <button type="button" class="sso-btn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      Enterprise SSO
    </button>

    <div class="footer">
      <a href="/forgot-password">Forgot password?</a> &bull; <a href="/contact">Contact Support</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate 404 page
 */
function generate404Page(env: Env): string {
  const content = `
    <div style="text-align: center; padding: 4rem 1rem;">
      <div style="font-size: 6rem; font-weight: 700; color: var(--primary); opacity: 0.3;">404</div>
      <h1 style="font-size: 1.75rem; margin: 1rem 0;">Page Not Found</h1>
      <p style="color: var(--text-muted); margin-bottom: 2rem;">The page you're looking for doesn't exist or has been moved.</p>
      <a href="/" class="btn btn-primary">Return to Dashboard</a>
    </div>
  `;

  return generateAppShell(content, 'Page Not Found', env);
}
