export type DataProductCategory =
  | 'Local Mobility'
  | 'Foot Traffic'
  | 'Consumer Pulse'
  | 'Device & Connectivity'
  | 'Market Research'
  | 'Local Demand Signals';

export type DataProductStatus = 'draft' | 'active' | 'coming_soon' | 'archived';

export type PricingModel = 'one_time' | 'subscription' | 'request_quote' | 'manual_approval';

export interface DataProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: DataProductCategory;
  buyerUseCase: string;
  geography: string;
  coverageArea: string;
  dataSources: string[];
  aggregationLevel: string;
  refreshFrequency: string;
  freshnessDate: string | null;
  sampleSize: number | null;
  recordCount: number | null;
  contributorCount: number | null;
  qualityScore: number | null;
  confidenceScore: number | null;
  privacyLevel: string;
  priceCents: number | null;
  pricingModel: PricingModel;
  status: DataProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BuyerAccessRequest {
  id: string;
  buyer_id: string;
  data_product_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'purchased' | 'active' | 'expired';
  requested_use_case: string | null;
  buyer_notes: string | null;
  created_at: string;
  updated_at: string;
  data_products?: DataProduct;
}

export interface CustomDatasetRequest {
  id: string;
  buyer_id: string | null;
  buyer_name: string;
  company_name: string;
  email: string;
  target_geography: string;
  data_category: string;
  use_case: string;
  refresh_cadence: string;
  aggregation_level: string;
  timeline: string;
  budget_range?: string;
  notes?: string;
  status: 'new' | 'in_review' | 'approved' | 'rejected';
  created_at: string;
}

export interface DataProductSampleRow {
  id: string;
  data_product_slug: string;
  date: string;
  market: string;
  zip_code: string;
  daypart?: string | null;
  category?: string | null;
  device_os?: string | null;
  network_type?: string | null;
  avg_signal_quality?: number | null;
  estimated_activity_index?: number | null;
  sample_size?: number | null;
  confidence_score?: number | null;
}
