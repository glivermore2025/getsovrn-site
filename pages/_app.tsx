import type { AppProps } from 'next/app';
import '../styles/globals.css';
import Layout from '../components/Layout';
import { AuthProvider } from '../lib/authContext';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
