import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skull, Lock, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function DarkWebMarketplace({ playerData, businesses }) {
  const queryClient = useQueryClient();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [riskMultiplier, setRiskMultiplier] = useState('2');

  const { data: darkWebListings = [] } = useQuery({
    queryKey: ['darkWebExchanges'],
    queryFn: () => base44.entities.CurrencyExchange.filter({ 
      status: 'active',
      risk_rating: { $gte: 70 }
    })
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ['businessRatings'],
    queryFn: () => base44.entities.BusinessRating.list('-created_date', 100)
  });

  const createDarkWebListingMutation = useMutation({
    mutationFn: async () => {
      const crypto = parseFloat(cryptoAmount);
      const cash = parseFloat(cashAmount);
      const risk = parseFloat(riskMultiplier);

      if (!crypto || !cash || !selectedBusiness) throw new Error('Invalid values');

      const dynamicRate = (cash / crypto) * (1 + (risk - 1) * 0.5); // Higher risk = better rate

      await base44.entities.CurrencyExchange.create({
        seller_id: playerData.id,
        business_id: selectedBusiness.id,
        exchange_type: 'crypto_to_cash',
        crypto_amount: crypto,
        cash_amount: cash * risk,
        exchange_rate: dynamicRate,
        fee_percentage: Math.max(2, selectedBusiness.transaction_fee - 3), // Lower fees on dark web
        available_volume: crypto,
        risk_rating: Math.min(100, 70 + risk * 10),
        minimum_order: 50000,
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['darkWebExchanges']);
      setShowCreateListing(false);
      setCryptoAmount('');
      setCashAmount('');
      toast.success('Dark web listing created!');
    },
    onError: (error) => toast.error(error.message)
  });

  const executeDarkWebTradeMutation = useMutation({
    mutationFn: async (listing) => {
      if ((playerData.crypto || 0) < listing.crypto_amount) throw new Error('Insufficient crypto');

      const successRoll = Math.random() * 100;
      const success = successRoll < (100 - listing.risk_rating + 40); // Higher risk = lower success

      if (success) {
        await base44.entities.Player.update(playerData.id, {
          crypto: (playerData.crypto || 0) - listing.crypto_amount,
          balance: playerData.balance + listing.cash_amount
        });

        await base44.entities.CurrencyExchange.update(listing.id, {
          status: 'completed'
        });

        toast.success(`High-risk exchange successful! +$${listing.cash_amount.toLocaleString()}`);
      } else {
        // Failed - lose crypto and gain heat
        await base44.entities.Player.update(playerData.id, {
          crypto: (playerData.crypto || 0) - listing.crypto_amount,
          heat: Math.min(100, (playerData.heat || 0) + 20)
        });

        await base44.entities.CurrencyExchange.update(listing.id, {
          status: 'cancelled'
        });

        toast.error('Exchange intercepted by LE! Crypto confiscated!');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['darkWebExchanges']);
      queryClient.invalidateQueries(['player']);
    },
    onError: (error) => toast.error(error.message)
  });

  const rateBusinessMutation = useMutation({
    mutationFn: async ({ businessId, rating, trustScore }) => {
      await base44.entities.BusinessRating.create({
        business_id: businessId,
        rater_id: playerData.id,
        rating,
        trust_score: trustScore
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['businessRatings']);
      toast.success('Rating submitted!');
    }
  });

  // Calculate business trust scores
  const getBusinessTrustScore = (businessId) => {
    const businessRatings = ratings.filter(r => r.business_id === businessId);
    if (businessRatings.length === 0) return 50;
    const avgRating = businessRatings.reduce((sum, r) => sum + r.trust_score, 0) / businessRatings.length;
    return avgRating;
  };

  return (
    <div className="space-y-4">
      {/* Warning Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-panel border-red-500/40 bg-gradient-to-r from-red-950/40 to-black/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <Skull className="w-5 h-5 text-red-400" />
              Dark Web Exchange
              <Badge className="bg-red-600 ml-2">High Risk</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-300">
            <p className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Higher rewards, higher risk of interception and confiscation
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 bg-red-900/30 rounded">
                <p className="text-gray-400">Success Rate</p>
                <p className="text-red-400 font-bold">30-60%</p>
              </div>
              <div className="p-2 bg-green-900/30 rounded">
                <p className="text-gray-400">Reward Multiplier</p>
                <p className="text-green-400 font-bold">2x - 5x</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Dark Listing */}
      {businesses.filter(b => b.marketplace_enabled).length > 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white text-sm">
              <span>Create Dark Web Listing</span>
              <Button
                size="sm"
                onClick={() => setShowCreateListing(!showCreateListing)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {showCreateListing ? 'Cancel' : 'New Listing'}
              </Button>
            </CardTitle>
          </CardHeader>

          {showCreateListing && (
            <CardContent className="space-y-3">
              <select
                value={selectedBusiness?.id || ''}
                onChange={(e) => setSelectedBusiness(businesses.find(b => b.id === e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 text-white rounded text-xs"
              >
                <option value="">Select Business</option>
                {businesses.filter(b => b.marketplace_enabled).map(b => (
                  <option key={b.id} value={b.id}>{b.business_name}</option>
                ))}
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
                  placeholder="Base Cash $"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="bg-slate-800 text-white text-xs"
                />
                <Input
                  type="number"
                  placeholder="Risk x"
                  value={riskMultiplier}
                  onChange={(e) => setRiskMultiplier(e.target.value)}
                  className="bg-slate-800 text-white text-xs"
                />
              </div>

              <div className="p-2 bg-purple-900/30 rounded text-xs">
                <p className="text-gray-400">Actual Payout: <span className="text-green-400 font-bold">
                  ${(parseFloat(cashAmount || 0) * parseFloat(riskMultiplier || 1)).toLocaleString()}
                </span></p>
                <p className="text-gray-400">Risk Rating: <span className="text-red-400 font-bold">
                  {Math.min(100, 70 + parseFloat(riskMultiplier || 1) * 10)}%
                </span></p>
              </div>

              <Button
                onClick={() => createDarkWebListingMutation.mutate()}
                disabled={!selectedBusiness || createDarkWebListingMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Create High-Risk Listing
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Dark Web Listings */}
      <Card className="glass-panel border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Lock className="w-4 h-4 text-red-400" />
            Active Dark Listings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {darkWebListings.length === 0 ? (
                <p className="text-gray-400 text-xs">No active dark web listings</p>
              ) : (
                darkWebListings.map(listing => {
                  const business = businesses.find(b => b.id === listing.business_id);
                  const isOwnListing = listing.seller_id === playerData.id;
                  const trustScore = getBusinessTrustScore(listing.business_id);

                  return (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-3 bg-gradient-to-r from-red-900/30 to-purple-900/30 rounded border border-red-500/40"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs">
                          <p className="text-white font-semibold">{business?.business_name || 'Anonymous'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < Math.round(trustScore / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                              />
                            ))}
                            <span className="text-gray-400 ml-1">({trustScore.toFixed(0)}%)</span>
                          </div>
                        </div>
                        <Badge className={listing.risk_rating > 85 ? 'bg-red-600' : 'bg-orange-600'}>
                          {listing.risk_rating}% Risk
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="p-1.5 bg-slate-900/50 rounded">
                          <p className="text-gray-400">You Pay</p>
                          <p className="text-purple-400 font-semibold">{listing.crypto_amount.toFixed(4)} ₿</p>
                        </div>
                        <div className="p-1.5 bg-slate-900/50 rounded">
                          <p className="text-gray-400">You Get</p>
                          <p className="text-green-400 font-semibold">${listing.cash_amount.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2 text-[10px]">
                        <Badge className="bg-yellow-600">Rate: {listing.exchange_rate.toFixed(2)}x</Badge>
                        <Badge className="bg-blue-600">Fee: {listing.fee_percentage}%</Badge>
                        {listing.risk_rating > 85 && (
                          <Badge className="bg-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-2 h-2" />
                            EXTREME
                          </Badge>
                        )}
                      </div>

                      {!isOwnListing && (
                        <Button
                          onClick={() => executeDarkWebTradeMutation.mutate(listing)}
                          disabled={executeDarkWebTradeMutation.isPending}
                          className="w-full bg-red-600 hover:bg-red-700 text-xs"
                        >
                          <Skull className="w-3 h-3 mr-1" />
                          Execute High-Risk Trade
                        </Button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}