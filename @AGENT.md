# Agent Build Instructions - Wedding Website

## Project Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and other credentials
```

## Environment Variables Required
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site Authentication
SITE_PASSWORD=your_site_password

# Resend (for email notifications)
RESEND_API_KEY=your_resend_api_key
RESEND_WEBHOOK_SECRET=your_resend_webhook_secret
```

## Running Development Server
```bash
# Start development server (default port 3000)
npm run dev

# Access at http://localhost:3000
```

## Build Commands
```bash
# Production build
npm run build

# Start production server (after build)
npm run start

# Lint code
npm run lint

# Type checking
npx tsc --noEmit
```

## Database Setup
```bash
# Using Supabase CLI
supabase db push

# Or manually run SQL files in Supabase dashboard:
# 1. supabase/schema.sql
# 2. supabase/migrations/* (in order)
```

## Testing Commands
```bash
# Currently no automated tests configured
# TODO: Add Jest/Vitest for unit tests
# TODO: Add Playwright for E2E tests
# Manual testing checklist:
# - Test RSVP form submission
# - Test password authentication
# - Test responsive design on mobile
# - Test accessibility with keyboard navigation
# - Test image uploads to gallery
# - Test Supabase connections
```

## Key Learnings

### Next.js 16 App Router
- Using app directory with route groups: (main) for authenticated pages
- Server components by default, use 'use client' for interactive components
- API routes in app/api/ directory

### Tailwind CSS v4
- New @theme syntax in globals.css for design tokens
- Using CSS variables for colors and typography
- Responsive utilities work the same as v3

### Supabase Integration
- Client initialization in src/lib/supabase/client.ts
- Server-side client for API routes in src/lib/supabase/server.ts
- Row Level Security (RLS) policies protect data
- Real-time subscriptions available for live updates

### Performance Considerations
- Images should use Next.js Image component for optimization
- Use dynamic imports for heavy components (Framer Motion animations)
- Lazy load gallery images with blur placeholders
- Consider edge runtime for API routes where possible

### Accessibility Requirements
- All interactive elements keyboard accessible
- Proper semantic HTML structure
- ARIA labels for icon buttons
- Color contrast meets WCAG AA standards
- Form validation with clear error messages
- Focus indicators visible

## Feature Development Quality Standards

**CRITICAL**: All new features MUST meet the following mandatory requirements before being considered complete.

### Testing Requirements

- **Minimum Coverage**: 85% code coverage ratio required for all new code
- **Test Pass Rate**: 100% - all tests must pass, no exceptions
- **Test Types Required**:
  - Unit tests for utility functions and hooks
  - Component tests for UI components
  - Integration tests for API endpoints
  - E2E tests for critical user workflows (RSVP, authentication)
- **Coverage Validation**: Once test framework is set up:
  ```bash
  npm run test:coverage
  ```
- **Test Quality**: Tests must validate behavior, not just achieve coverage metrics
- **Test Documentation**: Complex test scenarios must include comments explaining the test strategy
- **Manual Testing Checklist**: Until automated tests exist, manually verify:
  - [ ] Feature works on desktop Chrome/Firefox/Safari
  - [ ] Feature works on mobile iOS/Android
  - [ ] Feature is keyboard accessible
  - [ ] Feature works with screen reader
  - [ ] Feature handles errors gracefully
  - [ ] Feature has proper loading states

### Git Workflow Requirements

Before moving to the next feature, ALL changes must be:

1. **Committed with Clear Messages**:
   ```bash
   git add .
   git commit -m "feat(module): descriptive message following conventional commits"
   ```
   - Use conventional commit format: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, etc.
   - Include scope when applicable: `feat(rsvp):`, `fix(auth):`, `feat(gallery):`
   - Write descriptive messages that explain WHAT changed and WHY

2. **Pushed to Remote Repository**:
   ```bash
   git push -u origin <branch-name>
   ```
   - Never leave completed features uncommitted
   - Push regularly to maintain backup and enable collaboration
   - Ensure builds pass before considering feature complete

3. **Branch Hygiene**:
   - Work on feature branches starting with `claude/`
   - Branch naming: `claude/feature-description-XXXXX`
   - Create pull requests for all significant changes
   - Never push directly to main branch

4. **Ralph Integration**:
   - Update @fix_plan.md with new tasks before starting work
   - Mark items complete in @fix_plan.md upon completion
   - Update PROMPT.md if development patterns change
   - Test features work within Ralph's autonomous loop

### Documentation Requirements

**ALL implementation documentation MUST remain synchronized with the codebase**:

1. **Code Documentation**:
   - JSDoc comments for complex functions and React components
   - Update inline comments when implementation changes
   - Remove outdated comments immediately
   - Document props and return types in TypeScript

2. **Implementation Documentation**:
   - Update relevant sections in this @AGENT.md file
   - Keep build and test commands current
   - Update configuration examples when defaults change
   - Document breaking changes prominently

3. **README Updates**:
   - Keep feature lists current
   - Update setup instructions when dependencies change
   - Maintain accurate command examples
   - Update version compatibility information

4. **@AGENT.md Maintenance**:
   - Add new build patterns to relevant sections
   - Update "Key Learnings" with new insights
   - Keep command examples accurate and tested
   - Document new testing patterns or quality gates

### Feature Completion Checklist

Before marking ANY feature as complete, verify:

- [ ] Feature works as expected (manual testing)
- [ ] Code builds without errors (`npm run build`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Responsive design works on mobile and desktop
- [ ] Accessibility tested with keyboard navigation
- [ ] Code formatted according to project standards
- [ ] All changes committed with conventional commit messages
- [ ] All commits pushed to remote repository
- [ ] @fix_plan.md task marked as complete
- [ ] Implementation documentation updated in @AGENT.md
- [ ] Inline code comments updated or added where needed
- [ ] Breaking changes documented
- [ ] Features tested within Ralph loop (if applicable)

### Rationale

These standards ensure:
- **Quality**: Thorough testing and validation prevent regressions
- **Traceability**: Git commits and @fix_plan.md provide clear history of changes
- **Maintainability**: Current documentation reduces onboarding time and prevents knowledge loss
- **Collaboration**: Pushed changes enable team visibility and code review
- **Reliability**: Consistent quality gates maintain production stability
- **Automation**: Ralph integration ensures continuous development practices
- **User Experience**: Accessibility and responsive design testing ensure inclusive experience

**Enforcement**: AI agents should automatically apply these standards to all feature development tasks without requiring explicit instruction for each task.

## Deployment

### Vercel Deployment (Production)
1. Push code to GitHub
2. Vercel automatically builds and deploys
3. Ensure all environment variables are set in Vercel dashboard
4. Monitor build logs for errors

### Environment-Specific Notes
- **Development**: Uses local .env.local file
- **Production**: Uses Vercel environment variables
- **Supabase**: Same database for all environments (consider separate staging DB)

## Common Issues & Solutions

### Issue: Supabase connection fails
**Solution**: Check environment variables are set correctly, verify Supabase project URL

### Issue: Images not loading
**Solution**: Check image paths, ensure public directory is accessible, verify Image component src

### Issue: Tailwind styles not applying
**Solution**: Restart dev server, check globals.css is imported, verify class names

### Issue: TypeScript errors
**Solution**: Run `npm install` to ensure types are installed, check tsconfig.json

### Issue: Build fails on Vercel
**Solution**: Check build logs, ensure all dependencies are in package.json (not devDependencies if needed at build), verify environment variables

## Project-Specific Best Practices
- Keep components small and focused
- Use server components by default, client components only when needed
- Optimize images with Next.js Image component
- Use Supabase client utilities for database operations
- Follow the established design system colors and typography
- Maintain accessibility in all new features
- Test on mobile devices regularly
- Keep bundle size small (check with `npm run build`)

## Next Steps for Ralph Integration
- [ ] Set up automated testing framework (Jest/Vitest)
- [ ] Add E2E tests with Playwright
- [ ] Configure test coverage reporting
- [ ] Add pre-commit hooks for linting and type checking
- [ ] Set up CI/CD pipeline with GitHub Actions
- [ ] Add Lighthouse CI for performance monitoring
