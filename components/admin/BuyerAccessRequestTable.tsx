import { BuyerAccessRequest, CustomDatasetRequest, DataProduct } from '../../lib/types';

interface Props {
  requests: BuyerAccessRequest[];
  customRequests: CustomDatasetRequest[];
  products: Record<string, DataProduct>;
  onAction: (requestId: string, action: 'approved' | 'rejected') => Promise<void>;
  onCustomAction: (requestId: string, action: 'in_review' | 'approved' | 'rejected') => Promise<void>;
  loadingId: string | null;
}

export default function BuyerAccessRequestTable({ requests, customRequests, products, onAction, onCustomAction, loadingId }: Props) {
  if (!requests.length && !customRequests.length) {
    return (
      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
        No buyer requests found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {customRequests.map((request) => (
        <div key={request.id} className="rounded-3xl border border-blue-500/30 bg-blue-950/20 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-blue-300 mb-2">Custom request - {request.status}</p>
              <h3 className="text-xl font-semibold text-white">{request.data_category} for {request.target_geography}</h3>
              <p className="text-sm text-gray-400 mt-2">{request.use_case}</p>
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>Request date</p>
              <p className="mt-1 text-white">{new Date(request.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Buyer</p>
              <p className="mt-2 text-sm text-gray-300">{request.buyer_name}</p>
              <p className="mt-1 text-sm text-gray-500">{request.company_name}</p>
              <p className="mt-1 text-sm text-gray-500 break-all">{request.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Dataset requirements</p>
              <p className="mt-2 text-sm text-gray-300">Cadence: {request.refresh_cadence}</p>
              <p className="mt-1 text-sm text-gray-300">Aggregation: {request.aggregation_level}</p>
              <p className="mt-1 text-sm text-gray-300">Timeline: {request.timeline}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Notes and budget</p>
              <p className="mt-2 text-sm text-gray-300">{request.notes || 'No notes'}</p>
              <p className="mt-2 text-sm text-gray-500">Budget: {request.budget_range || 'Not provided'}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              disabled={loadingId === request.id || request.status !== 'new'}
              onClick={() => onCustomAction(request.id, 'in_review')}
              className="rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Mark In Review
            </button>
            <button
              disabled={loadingId === request.id || request.status === 'approved' || request.status === 'rejected'}
              onClick={() => onCustomAction(request.id, 'approved')}
              className="rounded-full bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Approve
            </button>
            <button
              disabled={loadingId === request.id || request.status === 'approved' || request.status === 'rejected'}
              onClick={() => onCustomAction(request.id, 'rejected')}
              className="rounded-full bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}

      {requests.map((request) => {
        const product = products[request.data_product_id];
        return (
          <div key={request.id} className="rounded-3xl border border-gray-800 bg-gray-950 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500 mb-2">{request.status}</p>
                <h3 className="text-xl font-semibold text-white">{product?.name ?? 'Unknown dataset'}</h3>
                <p className="text-sm text-gray-400 mt-2">{product?.buyerUseCase ?? 'No product details available.'}</p>
              </div>
              <div className="text-right text-sm text-gray-400">
                <p>Request date</p>
                <p className="mt-1 text-white">{new Date(request.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Buyer use case</p>
                <p className="mt-2 text-sm text-gray-300">{request.requested_use_case || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Buyer notes</p>
                <p className="mt-2 text-sm text-gray-300">{request.buyer_notes || 'No notes'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Buyer ID</p>
                <p className="mt-2 text-sm text-gray-300 break-all">{request.buyer_id}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                disabled={loadingId === request.id || request.status !== 'pending'}
                onClick={() => onAction(request.id, 'approved')}
                className="rounded-full bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={loadingId === request.id || request.status !== 'pending'}
                onClick={() => onAction(request.id, 'rejected')}
                className="rounded-full bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
