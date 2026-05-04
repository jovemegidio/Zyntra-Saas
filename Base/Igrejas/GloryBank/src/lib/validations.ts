import { z } from "zod";

// Validates CPF format
function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned.charAt(i)) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

// Validates CNPJ format
function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(cleaned.charAt(i)) * weights1[i];
  let remainder = sum % 11;
  if (remainder < 2) remainder = 0;
  else remainder = 11 - remainder;
  if (remainder !== parseInt(cleaned.charAt(12))) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(cleaned.charAt(i)) * weights2[i];
  remainder = sum % 11;
  if (remainder < 2) remainder = 0;
  else remainder = 11 - remainder;
  if (remainder !== parseInt(cleaned.charAt(13))) return false;

  return true;
}

const cpfCnpjSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ""))
  .refine(
    (val) => val.length === 11 || val.length === 14,
    "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos"
  )
  .refine(
    (val) =>
      val.length === 11 ? isValidCPF(val) : isValidCNPJ(val),
    "CPF/CNPJ inválido"
  );

export const registerSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim(),
  email: z
    .string()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .toLowerCase()
    .trim(),
  cpfCnpj: cpfCnpjSchema,
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine(
      (val) => val.length === 10 || val.length === 11,
      "Telefone deve ter 10 ou 11 dígitos"
    ),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(128, "Senha deve ter no máximo 128 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .toLowerCase()
    .trim(),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const pixTransferSchema = z.object({
  pixKey: z.string().min(1, "Chave PIX é obrigatória").max(100),
  pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"], {
    errorMap: () => ({ message: "Tipo de chave PIX inválido" }),
  }),
  amount: z
    .number()
    .positive("Valor deve ser positivo")
    .min(0.01, "Valor mínimo é R$ 0,01")
    .max(1000000, "Valor máximo é R$ 1.000.000,00"),
  description: z.string().max(200).optional(),
});

export const boletoSchema = z.object({
  customerName: z.string().min(3, "Nome do pagador é obrigatório"),
  customerCpfCnpj: cpfCnpjSchema,
  amount: z
    .number()
    .positive("Valor deve ser positivo")
    .min(5, "Valor mínimo é R$ 5,00"),
  dueDate: z.string().refine((val) => {
    const date = new Date(val);
    return date > new Date();
  }, "Data de vencimento deve ser futura"),
  description: z.string().max(200).optional(),
});

export const transferSchema = z.object({
  pixKey: z.string().min(1, "Chave PIX é obrigatória"),
  pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"]),
  amount: z
    .number()
    .positive("Valor deve ser positivo")
    .min(0.01, "Valor mínimo é R$ 0,01"),
  description: z.string().max(200).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PixTransferInput = z.infer<typeof pixTransferSchema>;
export type BoletoInput = z.infer<typeof boletoSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
