import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Type-safe navigation helpers for use in components
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
