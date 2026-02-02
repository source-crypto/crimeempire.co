import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Skull, TrendingUp, Star, AlertTriangle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function DarkWebMarket({ playerData, businesses }) {
  const queryClient = useQueryClient();
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  const { data: listings = [] } = useQuery({
    queryKey: ['darkWebExchanges'],
    queryFn: async () => {
      const all = await base44.entities.CurrencyExchange.filter({ status: 'active' });
      return all.filter(l => l.risk_rating > 60); // Dark web = high risk
    }
  });

  const { data: trustData = [] } = useQuery({
    queryKey: ['marketplaceTrust'],
    queryFn: () => base44.entities.MarketplaceTrust.list()
  });

  const createDarkListingMutation = useMutation({
    mutationFn: async (businessId) => {
      const crypto = parseFloat(cryptoAmount);
      const cash = parseFloat(cashAmount);

      if (!crypto || !cash) throw new Error('Invalid amounts');

      const business = businesses.find(b => b.id === businessId);
      if (!business?.marketplace_enabled) throw new Error('Marketplace not enabled');

      // Check trust score
      let trust = trustData.find(t => t.business_id === businessId);
      if (!trust) {
        trust = await base44.entities.MarketplaceTrust.create({
          business_id: businessId,
          player_id: playerData.id,
          trust_score: 50
        });
      }

      if (trust.trust_score < 30) throw new Error('Trust score too low for dark web');

      // Higher rates, higher risk
      const rate = 2.0 + Math.random() * 1.5;
      const risk = 70 + Math.random() * 30;

      await base44.entities.CurrencyExchange.create({
        seller_id: playerData.id,
        business_id: businessId,
        exchange_type: 'crypto_to_cash',
        crypto_amount: crypto,
        cash_amount: cash,
        exchange_rate: rate,
        fee_percentage: 2, // Lower fees on dark web
        available_volume: crypto,
        risk_rating: risk,
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

  const executeDarkTradeMutation = useMutation({
    mutationFn: async (listing) => {
      const fee = listing.cash_amount * (listing.fee_percentage / 100);
      
      if ((playerData.crypto || 0) < listing.crypto_amount) throw new Error('Insufficient crypto');

      // Dark web has risk of scam or LE sting
      const scamChance = listing.risk_rating * 0.3;
      const isScam = Math.random() * 100 < scamChance;

      if (isScam) {
        await base44.entities.Player.update(playerData.id, {
          crypto: (playerData.crypto || 0) - listing.crypto_amount,
          heat: Math.min(100, (playerData.heat || 0) + 20)
        });

        await base44.entities.CurrencyExchange.update(listing.id, { status: 'cancelled' });

        // Update seller trust negatively
        const trust = trustData.find(t => t.business_id === listing.business_id);
        if (trust) {
          await base44.entities.MarketplaceTrust.update(trust.id, {
            trust_score: Math.max(0, trust.trust_score - 15),
            failed_trades: (trust.failed_trades || 0) + 1
          });
        }

        throw new Error('SCAMMED! Lost crypto and gained heat!');
      }

      // Successful trade
      await base44.entities.Player.update(playerData.id, {
        crypto: (playerData.crypto || 0) - listing.crypto_amount,
        balance: playerData.balance + listing.cash_amount - fee
      });

      await base44.entities.CurrencyExchange.update(listing.id, { status: 'completed' });

      // Update seller trust positively
      const trust = trustData.find(t => t.business_id === listing.business_id);
      if (trust) {
        await base44.entities.MarketplaceTrust.update(trust.id, {
          trust_score: Math.min(100, trust.trust_score + 5),
          successful_trades: (trust.successful_trades || 0) + 1,
          total_volume_traded: (trust.total_volume_traded || 0) + listing.cash_amount
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['darkWebExchanges']);
      queryClient.invalidateQueries(['marketplaceTrust']);
      queryClient.invalidateQueries(['player']);
      toast.success('Dark web trade completed!');
    },
    onError: (error) => toast.error(error.message)
  });

  const enableDarkWebMutation = useMutation({
    mutationFn: async (businessId) => {
      const cost = 200000;
      if (playerData.balance < cost) throw new Error('Insufficient funds');

      let trust = trustData.find(t => t.business_id === businessId);
      if (!trust) {
        trust = await base44.entities.MarketplaceTrust.create({
          business_id: businessId,
          player_id: playerData.id,
          trust_score: 50
        });
      }

      await base44.entities.MarketplaceTrust.update(trust.id, {
        dark_web_access: true
      });

      await base44.entities.Player.update(playerData.id, {
        balance: playerData.balance - cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marketplaceTrust']);
      queryClient.invalidateQueries(['player']);
      toast.success('Dark web access granted!');
    },
    onError: (error) => toast.error(error.message)
  });

  const darkWebBusinesses = businesses.filter(b => {
    const trust = trustData.find(t => t.business_id === b.id);
    return trust?.dark_web_access && b.marketplace_enabled;
  });

  return (
    <div className="space-y-4">
      {/* Warning */}
      <Card className="glass-panel border-red-500/30 bg-gradient-to-br from-red-900/30 to-black">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Skull className="w-4 h-4 text-red-400" />
            Dark Web Exchange
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="p-2 bg-red-950/50 border border-red-500/30 rounded">
            <p className="text-red-300 font-semibold">⚠️ HIGH RISK ZONE</p>
            <p className="text-gray-400 text-[10px] mt-1">
              Better rates but risk of scams, LE stings, and heat. Trust ratings are critical.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Active Listings</p>
              <p className="text-red-400 font-bold">{listings.length}</p>
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <p className="text-gray-400">Your Crypto</p>
              <p className="text-purple-400 font-bold">{(playerData.crypto || 0).toFixed(4)} ₿</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enable Dark Web */}
      {businesses.filter(b => b.marketplace_enabled).length > 0 && darkWebBusinesses.length === 0 && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Enable Dark Web Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-gray-400">Unlock high-risk, high-reward exchanges ($200k per business)</p>
            {businesses.filter(b => b.marketplace_enabled).map(business => (
              <div key={business.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                <span className="text-white text-xs">{business.business_name}</span>
                <Button
                  size="sm"
                  onClick={() => enableDarkWebMutation.mutate(business.id)}
                  disabled={enableDarkWebMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-xs"
                >
                  Enable
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create Dark Listing */}
      {darkWebBusinesses.length > 0 && (
        <Card className="glass-panel border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white text-sm">
              <span>Create Dark Listing</span>
              <Button
                size="sm"
                onClick={() => setShowCreateListing(!showCreateListing)}
                className="bg-green-600 hover:bg-green-700"
              >
                {showCreateListing ? 'Cancel' : 'New'}
              </Button>
            </CardTitle>
          </CardHeader>

          {showCreateListing && (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
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
              </div>

              {darkWebBusinesses.map(business => {
                const trust = trustData.find(t => t.business_id === business.id);
                
                return (
                  <Button
                    key={business.id}
                    onClick={() => createDarkListingMutation.mutate(business.id)}
                    disabled={createDarkListingMutation.isPending}
                    className="w-full bg-red-600 hover:bg-red-700 text-xs justify-between"
                  >
                    <span>{business.business_name}</span>
                    <Badge className="bg-yellow-600">Trust: {trust?.trust_score || 50}</Badge>
                  </Button>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}

      {/* Dark Web Listings */}
      <div className="space-y-2">
        {listings.map(listing => {
          const business = businesses.find(b => b.id === listing.business_id);
          const trust = trustData.find(t => t.business_id === listing.business_id);
          const isOwnListing = listing.seller_id === playerData.id;

          return (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-panel border-red-500/20 bg-red-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Skull className="w-4 h-4 text-red-400" />
                      <div className="text-xs">
                        <p className="text-white font-semibold">{business?.business_name || 'Unknown'}</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span className="text-yellow-400 text-[10px]">
                            Trust: {trust?.trust_score || 50}/100
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={isOwnListing ? 'bg-blue-600' : 'bg-red-600 text-[10px]'}>
                        {isOwnListing ? 'Your Listing' : 'High Risk'}
                      </Badge>
                      {trust?.verified_seller && (
                        <Badge className="bg-green-600 text-[10px]">✓ Verified</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400 text-[10px]">Crypto</p>
                      <p className="text-purple-400 font-semibold">{listing.crypto_amount.toFixed(4)} ₿</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400 text-[10px]">Cash</p>
                      <p className="text-green-400 font-semibold">${(listing.cash_amount / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400 text-[10px]">Rate</p>
                      <p className="text-cyan-400 font-semibold">{listing.exchange_rate.toFixed(2)}x</p>
                    </div>
                    <div className="p-1.5 bg-slate-800/50 rounded">
                      <p className="text-gray-400 text-[10px]">Risk</p>
                      <p className="text-red-400 font-semibold">{Math.round(listing.risk_rating)}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] mb-2">
                    <AlertTriangle className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400">
                      {Math.round(listing.risk_rating * 0.3)}% scam chance • {listing.fee_percentage}% fee
                    </span>
                  </div>

                  {!isOwnListing && (
                    <Button
                      onClick={() => executeDarkTradeMutation.mutate(listing)}
                      disabled={executeDarkTradeMutation.isPending}
                      className="w-full bg-red-600 hover:bg-red-700 text-xs"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />
                      Execute Trade (RISKY)
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {listings.length === 0 && (
          <Card className="glass-panel border-gray-500/20 p-6 text-center">
            <p className="text-gray-400 text-xs">No dark web listings available</p>
          </Card>
        )}
      </div>
    </div>
  );
}