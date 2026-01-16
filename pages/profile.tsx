import Head from 'next/head';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../lib/authContext';
import Layout from '../components/Layout';

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // If profile doesn't exist, create one
      if (error.code === 'PGRST116') {
        await createProfile();
      }
    } else {
      setProfile(data);
      setFullName(data.full_name || '');
      setEmail(data.email || user.email || '');
      setPhoneNumber(data.phone_number || '');
      setDateOfBirth(data.date_of_birth || '');
    }
    setLoading(false);
  };

  const createProfile = async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        id: user.id,
        email: user.email,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      setError('Failed to create profile');
    } else {
      setProfile(data);
      setEmail(user.email || '');
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const supabase = getSupabaseClient();
    const updates = {
      full_name: fullName,
      email: email,
      phone_number: phoneNumber,
      date_of_birth: dateOfBirth,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } else {
      setSuccess('Profile updated successfully!');
      // Refresh profile data
      fetchProfile();
    }
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="text-center">
          <p className="text-red-400">You must be logged in to view your profile.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Profile – Sovrn</title>
      </Head>

      <div>
        <h1 className="text-3xl font-bold mb-8">User Profile</h1>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
              placeholder="Enter your phone number (for future 2FA)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
            />
            <p className="text-sm text-gray-400 mt-1">Must be 13+ years old to use the platform</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 py-3 rounded font-medium"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>

          {error && <p className="text-red-400 text-center">{error}</p>}
          {success && <p className="text-green-400 text-center">{success}</p>}
        </form>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Device Log</h2>
          <p className="text-gray-400 mb-4">Recent device activity and login sessions</p>

          {/* Placeholder for devices log - this would need a separate table or auth sessions */}
          <div className="bg-gray-800 p-4 rounded">
            <p className="text-sm text-gray-400">
              Device logging functionality will be implemented. This will track login sessions,
              device information, and activity for security purposes.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}