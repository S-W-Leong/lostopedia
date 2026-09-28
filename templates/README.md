# Organization Auth email templates

Edit the six HTML files in `templates/source/`. The `%%APP_NAME%%`, `%%ORGANIZATION_NAME%%`, `%%DESCRIPTION%%`, and `%%LOGO_PATH%%` markers are filled from `config/organization.json` by `pnpm run setup:organization`. The generated files in `templates/` are deterministic and checked by `pnpm exec tsx scripts/configure-organization.ts --check`.

The renderer escapes configuration values for HTML and preserves Supabase Auth variables such as `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`, `{{ .NewEmail }}`, and `{{ .SiteURL }}`. The logo URL uses `{{ .SiteURL }}` plus the validated local logo path, so the adopter hosts that asset. Set the Supabase Auth Site URL to the deployment's canonical application origin.

`supabase/config.toml` loads these generated files for local Auth. For a hosted project, copy their contents into the matching Auth email templates in the Supabase dashboard. Regenerate and copy them again after changing organization branding.

See the [Supabase local email template guide](https://supabase.com/docs/guides/local-development/customizing-email-templates) and [Auth email template guide](https://supabase.com/docs/guides/auth/auth-email-templates).
