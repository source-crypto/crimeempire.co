import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, User, LogOut, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlayerSetup() {
  const [currentUser, setCurrentUser] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Character data
  const [username, setUsername] = useState('');
  const [appearance, setAppearance] = useState({
    skin_tone: 'medium',
    hair_style: 'short',
    outfit: 'casual',
    accessory: 'none'
  });
  const [background, setBackground] = useState('streetwise');
  const [startingBonus, setStartingBonus] = useState('balanced');
  const [traits, setTraits] = useState([]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const players = await base44.entities.Player.filter({ created_by: user.email });
      if (players[0]) {
        setPlayerData(players[0]);
        window.location.href = createPageUrl('Dashboard');
      }
    } catch (error) {
      console.log('User not authenticated');
    }
  };

  const backgrounds = {
    streetwise: {
      name: 'Street Smart',
      description: 'Grew up on the streets, knows the underground',
      bonus: '+2 Stealth, +1 Negotiation',
      skills: { stealth: 3, negotiation: 2 }
    },
    military: {
      name: 'Ex-Military',
      description: 'Former soldier with tactical training',
      bonus: '+2 Combat, +1 Leadership',
      skills: { combat: 3, leadership: 2 }
    },
    hacker: {
      name: 'Tech Genius',
      description: 'Skilled in technology and digital crimes',
      bonus: '+3 Hacking',
      skills: { hacking: 3, stealth: 1 }
    },
    wheelman: {
      name: 'Professional Driver',
      description: 'Expert behind the wheel',
      bonus: '+3 Driving',
      skills: { driving: 3, combat: 1 }
    }
  };

  const bonusPackages = {
    balanced: {
      name: 'Balanced Start',
      crypto: 50000,
      buyPower: 25000,
      skillPoints: 5,
      description: 'Well-rounded foundation'
    },
    wealthy: {
      name: 'Trust Fund Criminal',
      crypto: 100000,
      buyPower: 50000,
      skillPoints: 3,
      description: 'More money, fewer skills'
    },
    skilled: {
      name: 'Experienced Operator',
      crypto: 30000,
      buyPower: 15000,
      skillPoints: 10,
      description: 'More skills, less money'
    },
    connected: {
      name: 'Well Connected',
      crypto: 40000,
      buyPower: 30000,
      skillPoints: 5,
      description: 'Higher starting reputation',
      reputationBonus: 500
    }
  };

  const personalityTraits = [
    'Ruthless', 'Calculating', 'Charismatic', 'Paranoid',
    'Ambitious', 'Loyal', 'Opportunistic', 'Cautious'
  ];

  const handleCreatePlayer = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setLoading(true);
    try {
      const bonus = bonusPackages[startingBonus];
      const bg = backgrounds[background];

      const baseSkills = {
        combat: 1,
        stealth: 1,
        driving: 1,
        hacking: 1,
        leadership: 1,
        negotiation: 1,
        ...bg.skills
      };

      const newPlayer = await base44.entities.Player.create({
        username: username.trim(),
        crypto_balance: bonus.crypto,
        buy_power: bonus.buyPower,
        endgame_points: bonus.reputationBonus || 0,
        strength_score: 10,
        wanted_level: 0,
        level: 1,
        experience: 0,
        skill_points: bonus.skillPoints,
        skills: baseSkills,
        territory_count: 0,
        total_earnings: 0,
        stats: {
          heists_completed: 0,
          heists_failed: 0,
          battles_won: 0,
          battles_lost: 0,
          territories_captured: 0,
          total_loot: 0
        },
        playstyle: 'balanced',
        character_appearance: appearance,
        background_story: background,
        starting_bonus: startingBonus,
        personality_traits: traits
      });

      await base44.entities.TransactionLog.create({
        transaction_type: 'transfer',
        player_id: newPlayer.id,
        player_username: username,
        counterparty_name: 'System',
        amount: bonus.crypto,
        description: 'Initial player funding',
        status: 'completed'
      });

      toast.success('Character created successfully!');
      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      toast.error('Failed to create character');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
        <Card className="glass-panel border-purple-500/20 w-full max-w-md">
          <CardContent className="p-12 text-center">
            <Zap className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <h2 className="text-2xl font-bold text-white mb-4">Welcome to CrimeEmpire</h2>
            <p className="text-gray-400 mb-6">Please log in to continue</p>
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
              onClick={() => base44.auth.redirectToLogin(createPageUrl('PlayerSetup'))}
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-4">
      <Card className="glass-panel border-purple-500/20 w-full max-w-3xl">
        <CardHeader className="border-b border-purple-500/20">
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-6 h-6 text-purple-400" />
              Create Your Criminal Character
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="mb-6">
            <p className="text-gray-300 mb-2">Logged in as:</p>
            <p className="text-white font-semibold">{currentUser.email}</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s ? 'bg-purple-600 text-white' : 'bg-slate-800 text-gray-500'
                }`}>
                  {s}
                </div>
                {s < 4 && <div className={`w-12 h-1 ${step > s ? 'bg-purple-600' : 'bg-slate-800'}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username" className="text-gray-300">
                      Choose Your Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter username..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-2 bg-slate-900/50 border-purple-500/20 text-white"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Appearance */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Customize Appearance</h3>
                <div className="space-y-6">
                  <div>
                    <Label className="text-gray-300 mb-3 block">Skin Tone</Label>
                    <RadioGroup value={appearance.skin_tone} onValueChange={(v) => setAppearance({...appearance, skin_tone: v})}>
                      <div className="grid grid-cols-3 gap-3">
                        {['light', 'medium', 'dark'].map((tone) => (
                          <div key={tone} className="flex items-center space-x-2 glass-panel p-3 rounded-lg">
                            <RadioGroupItem value={tone} id={`tone-${tone}`} />
                            <Label htmlFor={`tone-${tone}`} className="text-white capitalize cursor-pointer flex-1">
                              {tone}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-3 block">Hair Style</Label>
                    <RadioGroup value={appearance.hair_style} onValueChange={(v) => setAppearance({...appearance, hair_style: v})}>
                      <div className="grid grid-cols-2 gap-3">
                        {['short', 'long', 'bald', 'mohawk'].map((style) => (
                          <div key={style} className="flex items-center space-x-2 glass-panel p-3 rounded-lg">
                            <RadioGroupItem value={style} id={`hair-${style}`} />
                            <Label htmlFor={`hair-${style}`} className="text-white capitalize cursor-pointer flex-1">
                              {style}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-3 block">Outfit</Label>
                    <RadioGroup value={appearance.outfit} onValueChange={(v) => setAppearance({...appearance, outfit: v})}>
                      <div className="grid grid-cols-2 gap-3">
                        {['casual', 'formal', 'tactical', 'streetwear'].map((outfit) => (
                          <div key={outfit} className="flex items-center space-x-2 glass-panel p-3 rounded-lg">
                            <RadioGroupItem value={outfit} id={`outfit-${outfit}`} />
                            <Label htmlFor={`outfit-${outfit}`} className="text-white capitalize cursor-pointer flex-1">
                              {outfit}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Background */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Choose Your Background</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(backgrounds).map(([key, bg]) => (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-all ${
                        background === key
                          ? 'glass-panel border-purple-500 neon-border'
                          : 'glass-panel border-purple-500/20 hover:border-purple-500/50'
                      }`}
                      onClick={() => setBackground(key)}
                    >
                      <CardContent className="p-4">
                        <h4 className="text-lg font-bold text-white mb-2">{bg.name}</h4>
                        <p className="text-gray-400 text-sm mb-3">{bg.description}</p>
                        <div className="text-xs text-green-400 font-semibold">{bg.bonus}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6">
                  <Label className="text-gray-300 mb-3 block">Personality Traits (Select up to 3)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {personalityTraits.map((trait) => (
                      <Button
                        key={trait}
                        variant={traits.includes(trait) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (traits.includes(trait)) {
                            setTraits(traits.filter(t => t !== trait));
                          } else if (traits.length < 3) {
                            setTraits([...traits, trait]);
                          }
                        }}
                        className={traits.includes(trait) ? 'bg-purple-600' : ''}
                      >
                        {trait}
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Starting Bonus */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Select Starting Package</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(bonusPackages).map(([key, pkg]) => (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-all ${
                        startingBonus === key
                          ? 'glass-panel border-cyan-500 neon-border'
                          : 'glass-panel border-cyan-500/20 hover:border-cyan-500/50'
                      }`}
                      onClick={() => setStartingBonus(key)}
                    >
                      <CardContent className="p-4">
                        <h4 className="text-lg font-bold text-white mb-2">{pkg.name}</h4>
                        <p className="text-gray-400 text-sm mb-3">{pkg.description}</p>
                        <div className="space-y-1 text-xs">
                          <div className="text-green-400">💰 ${(pkg.crypto / 1000).toFixed(0)}k Crypto</div>
                          <div className="text-blue-400">💵 ${(pkg.buyPower / 1000).toFixed(0)}k Cash</div>
                          <div className="text-yellow-400">⭐ {pkg.skillPoints} Skill Points</div>
                          {pkg.reputationBonus && (
                            <div className="text-purple-400">👑 +{pkg.reputationBonus} Reputation</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="glass-panel border-green-500/30 mt-6 p-4">
                  <h4 className="text-white font-semibold mb-2">Character Summary</h4>
                  <div className="text-sm text-gray-300 space-y-1">
                    <div>👤 Username: <span className="text-white font-semibold">{username || 'Not set'}</span></div>
                    <div>🎭 Background: <span className="text-purple-400">{backgrounds[background].name}</span></div>
                    <div>✨ Traits: <span className="text-cyan-400">{traits.join(', ') || 'None selected'}</span></div>
                    <div>📦 Package: <span className="text-green-400">{bonusPackages[startingBonus].name}</span></div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 1 || loading}
              className="text-gray-400"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !username.trim()}
                className="bg-gradient-to-r from-purple-600 to-cyan-600"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreatePlayer}
                disabled={loading || !username.trim()}
                className="bg-gradient-to-r from-purple-600 to-cyan-600"
              >
                {loading ? 'Creating...' : 'Start Your Empire'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}