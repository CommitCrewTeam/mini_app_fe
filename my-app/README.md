# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
# Phone imports

Open `/` (the old `/phone-imports` path redirects here). The existing dashboard layout contains a CSV upload form (CREATE, UPDATE, RESTOCK), lookup by import ID, statistics, validation and approval actions. Running jobs refresh every 3 seconds; a failed statistics request pauses polling until you select **Tải lại**.

All API calls use /{service_directory}/api/v1/... through gateway. Vite dev/preview proxies these paths to GATEWAY_URL (default http://localhost:6002). Start config_service on 6001 before gateway. Production hosting must proxy these same paths to gateway. The temporary page guard bypass does not bypass API authentication. Responses must use the `ApiResponse` envelope from `PhoneImportController`.

Run the import checks with `npx vitest run src/test/PhoneImports.test.jsx src/test/phoneImportApi.test.js`; build with `npm run build`.
