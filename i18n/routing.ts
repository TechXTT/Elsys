import {createNavigation} from "next-intl/navigation";

import { localePrefix, locales } from "./config";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales,
  localePrefix,
});

