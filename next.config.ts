import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La plantilla del Excel se lee en tiempo de ejecución: hay que incluirla en la función de Vercel.
  outputFileTracingIncludes: {
    "/api/export/**": ["./templates/**"],
  },
};

export default nextConfig;
