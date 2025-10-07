# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

携帯ショップ外販イベント実績分析システム - A web application for managing and analyzing mobile shop sales event performance data.

## Development Commands

```bash
# Development
npm run dev              # Start development server (http://localhost:3000)

# Build
npm run build           # Production build
npm start              # Start production server

# Database (Supabase)
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run database migrations
npm run prisma:studio   # Open Prisma Studio (database GUI)

# Code Quality
npm run lint           # Run ESLint
```

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **UI**: React 18, TypeScript, Tailwind CSS
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Date**: date-fns
- **Icons**: lucide-react

## Architecture

### Database Schema (Supabase)

Main tables:
- `performances` - Event performance records with sales metrics
- `staff_daily_performances` - Daily performance data per staff member
- `id_calculation_data` - Calculation period configurations for ID metrics
- `event_photos` - Photos associated with events
- `profiles` - User profiles with role-based access (admin/user)

Authentication uses Supabase Auth with Row Level Security policies.

### ID Calculation System

**Critical**: The system uses two different ID calculation approaches:

1. **Dashboard ID Calculation** (`/src/app/dashboard/page.tsx`):
   - Multiplies actual counts by ALL coefficient types (SP1, SP2, SIM)
   - Formula: `(actual_au_mnp * au_mnp_sp1) + (actual_au_mnp * au_mnp_sp2) + (actual_au_mnp * au_mnp_sim) + ...`
   - Used in: Monthly ID ranking

2. **New ID Calculator** (`/src/lib/id-calculator.ts`):
   - Divides counts by 3 before applying coefficients
   - Formula: `(actual_au_mnp/3 * au_mnp_sp1) + (actual_au_mnp/3 * au_mnp_sp2) + (actual_au_mnp/3 * au_mnp_sim) + ...`
   - Used in: Performance list, detail pages, analytics charts

The calculation period is auto-detected based on event year/month matching `id_calculation_data.calculation_period_start/end`.

### Key Pages & Routes

**Main Application**:
- `/dashboard` - Monthly statistics, charts, event rankings
- `/input` - Event performance input form (dynamic imported)
- `/view` - Performance list with filtering
- `/view/[id]` - Detailed event view with staff breakdowns
- `/edit/[id]` - Edit event performance
- `/analytics` - Advanced analytics with multiple chart types
- `/album` - Event photo gallery
- `/calculator` - New ID calculator tool

**Admin**:
- `/admin` - Admin dashboard
- `/admin/approvals` - User approval management
- `/admin/users` - User management

### Component Structure

**Form Components**:
- `enhanced-performance-form-v2.tsx` - Main event input form
  - Handles event details, target/actual metrics, staff performances
  - Uses React Hook Form with Zod validation
  - Dynamic staff fields with date-based performance tracking
  - Auto-fills year/month/week when date selected

**Chart/Analytics Components**:
- `performance-analytics-v2.tsx` - Main analytics component
- `performance-analytics-v2-with-monthly.tsx` - Analytics with monthly status
- `monthly-achievement-status.tsx` - Monthly achievement panel

**List Components**:
- `performance-list-v2.tsx` - Event list with panel/list view modes
- Displays calculated total IDs using `calculateEventTotalIds()`

**Special Effects**:
- `MagneticDots` - Background animation using direct DOM manipulation (not React state)
  - 30px spacing, 4px dots, 0.8 opacity
  - Uses `requestAnimationFrame` with 60fps throttling
  - Performance optimized with `will-change: transform`

### API Routes

All API routes in `/src/app/api/`:
- `performances/enhanced-v2/route.ts` - Event CRUD operations
- `events/[id]/detail/route.ts` - Event detail with staff data
- `id-calculation-periods/route.ts` - ID calculation period data
- `upload/route.ts` - Photo uploads to Supabase Storage

### Styling Standards

**Unified Panel Style** (established pattern):
```tsx
className="glass rounded-lg border p-6"
style={{
  borderColor: '#22211A',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)'
}}
```

**Color Palette**:
- Primary: `#22211A` (dark text/borders)
- Accent: `#FFB300` (highlights, rankings)
- Background: `rgba(220, 237, 200, 0.75)` (main pages)
- Success: `#4abf79`
- Chart colors: Defined in `COLORS` array (greens, yellows, browns)

**Typography Effects**:
- Title typing animation: 50ms interval, blinking cursor on description only
- Success message typing: 30ms interval
- No animation classes on panels (removed all transition/hover effects)

### Performance Optimizations

1. **MagneticDots**: Uses `useRef` + direct DOM manipulation instead of React state
2. **Dynamic Imports**: Heavy components lazy loaded (e.g., `EnhancedPerformanceFormV2`)
3. **Memoization**: `useCallback`/`useMemo` for expensive calculations in dashboard
4. **Chart Animations**: 800ms for bar/pie charts, 1000ms for line charts
5. **Image Config**: AVIF/WebP formats, remote patterns for Supabase storage

### Data Flow

1. **Event Creation/Update**:
   - Form submission → API route → Supabase insert/update
   - Staff performances stored in separate table linked by performance_id
   - Photos uploaded to Supabase Storage, URLs stored in event_photos table

2. **ID Calculation**:
   - Event year/month → Find matching calculation period
   - Apply coefficients based on period
   - Display calculated IDs in lists and details

3. **Analytics**:
   - Fetch all performances → Client-side filtering (year/month/week/venue)
   - Calculate aggregations (monthly trends, venue stats, achievement rates)
   - Render charts with Recharts

### Important Patterns

**Supabase Client Usage**:
```typescript
// Server components/API routes
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client components
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

**Form Auto-Population**:
When `startDate` changes in the performance form:
- Auto-set `year`, `month`, `weekNumber` using `date-fns`
- Trigger `updateStaffDailyPerformances()` to recalculate event days

**Navigation Context**:
Uses `NavigationProvider` to manage sidebar collapse state across the app.

## Common Issues & Solutions

**404 on Static Assets**: Restart dev server (static file cache issue)

**ID Calculations Don't Match**: Check which calculation method should be used (dashboard vs. new ID calculator)

**RLS Errors**: Some tables have RLS disabled for development. Check `temp_disable_auth_*.sql` files.

**Photo Upload Failures**: Verify Supabase Storage bucket permissions and CORS settings.

## Development Notes

- The codebase uses Japanese text extensively in UI and comments
- All date formatting uses `date-fns` with Japanese locale (`ja`)
- Event periods can span multiple days; staff performances tracked per day
- The system tracks both target (目標) and actual (実績) metrics
- Achievement is calculated as: `actual_hs_total >= target_hs_total`
