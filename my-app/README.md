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

Open `/phone-imports` after signing in. The existing dashboard layout contains a CSV upload form (CREATE, UPDATE, RESTOCK), lookup by import ID, statistics, validation and approval actions. Running jobs refresh every 3 seconds; a failed statistics request pauses polling until you select **Tải lại**.

During development, Vite proxies `/api/phones` to `http://localhost:8082`. For deployment, route this path to the inventory service or set `VITE_PHONE_IMPORT_API_URL` to the full imports base path before building. Responses must use the `ApiResponse` envelope from `PhoneImportController`.

Run the import checks with `npx vitest run src/test/PhoneImports.test.jsx src/test/phoneImportApi.test.js`; build with `npm run build`.
