// pages/_app.tsx
import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/authContext';
import Layout from '../components/layout'; // If using a layout wrapper
import '../styles/globals.css'; // If you have global styles

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}

export default MyApp;
