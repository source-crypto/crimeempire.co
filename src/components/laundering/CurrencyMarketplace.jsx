import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, ArrowRightLeft, Plus, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function CurrencyMarketplace({ playerData, businesses }) {
  const queryClient = useQueryClient();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [exchangeType, setExchangeType] = useState('crypto_to_cash');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('1.5');

  const { data: listings = [] } = useQuery({
    queryKey: ['currencyExchanges'],
    queryFn: () => base44.entities.CurrencyExchange.filter({ status: 'active' }, '-created_date', 50)
  });

  const createListingMutation = useMutation({
    mutationFn: async () => {
      const crypto = parseFloat(cryptoAmount);
      const cash = parseFloat(cashAmount);
      const rate = parseFloat(exchangeRate);

      if (!crypto || !cash || !rate) throw new Error('Invalid values');
      if (!selectedBusiness?.marketplace_enabled) throw new Error('Business not marketplace-enabled');

      await base44.entities.CurrencyExchange.create({
        seller_id: playerData.id,
        business_id: selectedBusiness.id,
        exchange_type: exchangeType,
        crypto_amount: crypto,
        cash_amount: cash,
        exchange_rate: rate,
        fee_percentage: selectedBusiness.transaction_fee || 5,
        available_volume: exchangeType === 'crypto_to_cash' ? crypto : cash,
        risk_rating: Math.random() * 50 + 30,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currencyExchanges']);
      setShowCreateListing(false);
      setCryptoAmount('');
      setCashAmount('');
      toast.success('Exchange listing created!');
    },
    onError: (error) => toast.error(error.message)
  });

  const executeExchangeMutation = useMutation({
    mutationFn: async (listing) => {
      const fee = listing.cash_amount * (listing.fee_percentage / 100);
      
      if (listing.exchange_type === 'crypto_to_cash') {
        // Buyer pays crypto, receives cash
        if ((playerData.crypto || 0) < listing.crypto_amount) throw new Error('Insufficient crypto');

        await base44.entities.Player.update(playerData.id, {
          crypto: (playerData.crypto || 0) - listing.crypto_amount,
          balance: playerData.balance + listing.cash_amount - fee
        });
      } else {
        // Buyer pays cash, receives crypto
        if (playerData.balance < listing.cash_amount) throw new Error('Insufficient cash');

        await base44.entities.Player.update(playerData.id, {
          balance: playerData.balance - listing.cash_amount - fee,
          crypto: (playerData.crypto || 0) + listing.crypto_amount
        });
      }

      await base44.entities.CurrencyExchange.update(listing.id, {
        status: 'completed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currencyExchanges']);
      queryClient.invalidateQueries(['player']);
      toast.success('Exchange completed!');
    },
    onError: (error) => toast.error(error.message)
  });

  const enableMarketplaceMutation = useMutation({
    mutationFn: async (business) => {
      const cost = 150000;
      if (playerData.balance < cost) throw new Error('Insufficient funds');

      await base44.entities.MoneyLaunderingBusiness.update(business.id, {
        marketplace_enabled: true
      });

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['launderingBusinesses']);
      queryClient.invalidateQueries(['player']);
      toast.success('Marketplace enabled!');
    },
    onError: (error) => toast.error(error.message)
  });

  const marketplaceBusinesses = businesses.filter(b => b.marketplace_enabled);

  return (
    <div className="space-y-4">
      {/* Marketplace Overview */}
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Currency Exchange Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-400">
            Trade digital currency for in-game cash through money laundering fronts
          </p>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Active Listings</p>
              <p className="text-cyan-400 font-bold">{listings.length}</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Your Balance</p>
              <p className="text-green-400 font-bold">${(playerData.balance / 1000).toFixed(0)}k</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Your Crypto</p>
              <p className="text-purple-400 font-bold">{(playerData.crypto || 0).toFixed(2)} ₿</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enable Marketplace */}
      {businesses.length > 0 && marketplaceBusinesses.length === 0 && (
        <Card className="glass-panel border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Enable Marketplace Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-gray-400">Upgrade a business to facilitate currency exchanges</p>
            {businesses.map(business => (
              <div key={business.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                <span className="text-white text-xs">{business.business_name}</span>
                <Button
                  size="sm"
                  onClick={() => enableMarketplaceMutation.mutate(business)}
                  disabled={enableMarketplaceMutation.isPending}
                  className="bg-yellow-600 hover:bg-yellow-700 text-xs"
                >
                  Enable ($150k)
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create Listing */}
      {marketplaceBusinesses.length > 0 && (
        <Card className="glass-panel border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white text-sm">
              <span>Create Exchange Listing</span>
              <Button
                size="sm"
                onClick={() => setShowCreateListing(!showCreateListing)}
                className="bg-green-600 hover:bg-green-700"
              >
                {showCreateListing ? 'Cancel' : 'New Listing'}
              </Button>
            </CardTitle>
          </CardHeader>

          {showCreateListing && (
            <CardContent className="space-y-3">
              <select
                value={selectedBusiness?.id || ''}
                onChange={(e) => setSelectedBusiness(marketplaceBusinesses.find(b => b.id === e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 text-white rounded text-xs"
              >
                <option value="">Select Business</option>
                {marketplaceBusinesses.map(b => (
                  <option key={b.id} value={b.id}>{b.business_name}</option>
                ))}
              </select>

              <select
                value={exchangeType}
                onChange={(e) => setExchangeType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 text-white rounded text-xs"
              >
                <option value="crypto_to_cash">Crypto → Cash</option>
                <option value="cash_to_crypto">Cash → Crypto</option>
              </select>

              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Crypto ₿"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  className="bg-slate-800 text-white text-xs"
                />
                <Input
                  type="number"
                  placeholder="Cash $"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="bg-slate-800 text-white text-xs"
                />
                <Input
                  type="number"
                  placeholder="Rate"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="bg-slate-800 text-white text-xs"
                />
              </div>

              <Button
                onClick={() => createListingMutation.mutate()}
                disabled={!selectedBusiness || createListingMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Create Listing
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Active Listings */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Exchange Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {listings.length === 0 ? (
              <p className="text-gray-400 text-xs">No active listings</p>
            ) : (
              listings.map(listing => {
                const business = businesses.find(b => b.id === listing.business_id);
                const isOwnListing = listing.seller_id === playerData.id;

                return (
                  <div key={listing.id} className="p-3 bg-slate-900/50 rounded border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs">
                        <p className="text-white font-semibold">{business?.business_name || 'Unknown Business'}</p>
                        <p className="text-gray-400 text-[10px]">
                          {listing.exchange_type === 'crypto_to_cash' ? '₿ → $' : '$ → ₿'}
                        </p>
                      </div>
                      <Badge className={isOwnListing ? 'bg-blue-600' : 'bg-gray-600'}>
                        {isOwnListing ? 'Your Listing' : 'Buy'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Crypto</p>
                        <p className="text-purple-400 font-semibold">{listing.crypto_amount.toFixed(4)} ₿</p>
                      </div>
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Cash</p>
                        <p className="text-green-400 font-semibold">${listing.cash_amount.toLocaleString()}</p>
                      </div>
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Rate</p>
                        <p className="text-blue-400 font-semibold">{listing.exchange_rate}x</p>
                      </div>
                      <div className="p-1.5 bg-slate-800/50 rounded">
                        <p className="text-gray-400">Fee</p>
                        <p className="text-yellow-400 font-semibold">{listing.fee_percentage}%</p>
                      </div>
                    </div>

                    {!isOwnListing && (
                      <Button
                        onClick={() => executeExchangeMutation.mutate(listing)}
                        disabled={executeExchangeMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700 text-xs"
                      >
                        <ArrowRightLeft className="w-3 h-3 mr-1" />
                        Execute Exchange
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}