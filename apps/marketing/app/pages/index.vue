<template>
  <div>
    <header style="border-bottom: 1px solid #e5e7eb; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
      <strong style="font-size: 1.25rem;">MySite</strong>
      <nav style="display: flex; gap: 24px; font-size: 0.875rem;">
        <a href="http://localhost:3000/login">Login</a>
        <a href="http://localhost:3000/register" style="background: #111827; color: white; padding: 8px 16px; border-radius: 6px;">Get started</a>
      </nav>
    </header>

    <main style="max-width: 720px; margin: 0 auto; padding: 80px 24px; text-align: center;">
      <h1 style="font-size: 3rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 16px;">
        Build something great
      </h1>
      <p style="font-size: 1.25rem; color: #6b7280; margin-bottom: 40px;">
        Site for mysite.com. This is the public-facing landing page.
      </p>
      <a
        href="http://localhost:3000/register"
        style="display: inline-block; background: #111827; color: white; padding: 14px 28px; border-radius: 8px; font-weight: 500;"
      >
        Start free →
      </a>
    </main>
  </div>
</template>
