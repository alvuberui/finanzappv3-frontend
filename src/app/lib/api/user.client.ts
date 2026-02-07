// app/lib/api/users.client.ts
import { httpRequest } from "@/app/lib/api/http";

export type OnboardingPayload = {
  email: string;
  name: string;
  lastname: string;
  birthdate: string; // YYYY-MM-DD
  initialWealth: number;
  monthlySavingPercentage: number;
  monthlyNecessaryExpensesPercentage: number;
  monthlyDiscretionaryExpensesPercentage: number;
  monthlyInvestmentPercentage: number;
};

const API_GATEWAY_URL = process.env.API_GATEWAY_URL ?? "http://localhost:8081";

export async function createUser(payload: OnboardingPayload, accessToken: string) {
  return httpRequest({
    baseUrl: API_GATEWAY_URL,
    path: "/user/users/",
    method: "POST",
    accessToken,
    body: payload,
  });
}

export async function isOnboarded(email: string, accessToken: string) {
  return httpRequest({
    baseUrl: API_GATEWAY_URL,
    path: `/user/users/isOnboarded?email=${encodeURIComponent(email)}`,
    method: "GET",
    accessToken,
  });
}
