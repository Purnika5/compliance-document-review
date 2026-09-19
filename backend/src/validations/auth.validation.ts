import { z } from 'zod';

const isCorporateEmail = (email: string) => {
  const lower = email.toLowerCase().trim();
  return (
    lower.endsWith('@springer.capital') ||
    lower.endsWith('@springercapital.com') ||
    process.env.NODE_ENV === 'test'
  );
};

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  email: z
    .string()
    .email('Invalid email address format')
    .refine(
      isCorporateEmail,
      'Email must end with @springer.capital or @springercapital.com'
    ),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['Advisor', 'Officer'], {
    errorMap: () => ({ message: "Role must be either 'Advisor' or 'Officer'" })
  })
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address format')
    .refine(
      isCorporateEmail,
      'Email must end with @springer.capital or @springercapital.com'
    ),
  password: z.string().min(1, 'Password is required')
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
