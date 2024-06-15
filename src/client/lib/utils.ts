import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function forceArray<T>(input: MaybeArray<T>): T[] {
  return Array.isArray(input) ? input : [input];
}
