import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/authContext'; // ✅ make sure this path is correct
import Layout from '../components/Layout'; // ✅ assuming your layout is in /components
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}
