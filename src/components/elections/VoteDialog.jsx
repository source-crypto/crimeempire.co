import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins } from 'lucide-react';

export default function VoteDialog({ candidate, maxCrypto, open, onClose, onConfirm, busy }) {
  const [amount, setAmount] = useState('');

  useEffect(() => { if (open) setAmount(''); }, [open, candidate]);

  const value = parseFloat(amount) || 0;
  const canVote = value > 0 && value <= maxCrypto;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle>Vote for {candidate?.username}</DialogTitle>
          <DialogDescription className="text-gray-400">
            The more crypto you commit, the more weight your vote carries. Your balance: {Number(maxCrypto || 0).toLocaleString()} crypto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="vote-amt">Crypto to commit</Label>
          <Input id="vote-amt" type="number" min="1" max={maxCrypto} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500" />
          {value > maxCrypto && <p className="text-xs text-red-400">That exceeds your crypto balance.</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(value)} disabled={!canVote || busy}>
            <Coins className="w-4 h-4" /> Commit Vote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}