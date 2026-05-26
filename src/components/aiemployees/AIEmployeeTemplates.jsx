import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Download, Trash2, Plus, BookTemplate } from 'lucide-react';

const STORAGE_KEY = 'ai_employee_templates';

function loadTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

const PRESET_TEMPLATES = [
  {
    id: 'preset_logistics',
    name: 'Logistics Manager',
    role: 'logistics',
    skill: 'supply_chain',
    skill_level: 5,
    passive_income_rate: 1200,
    schedule_type: 'interval',
    schedule_interval_mins: 30,
    system_instructions: 'Optimize supply routes and reduce delivery times. Focus on cost efficiency.',
    task_parameters: { priority: 'efficiency', auto_restock: true },
    isPreset: true,
  },
  {
    id: 'preset_security',
    name: 'Security Chief',
    role: 'security',
    skill: 'defense',
    skill_level: 7,
    passive_income_rate: 800,
    schedule_type: 'interval',
    schedule_interval_mins: 15,
    system_instructions: 'Monitor facility perimeter and alert on intrusions. Escalate threats immediately.',
    task_parameters: { alert_threshold: 'medium', patrol_mode: 'active' },
    isPreset: true,
  },
  {
    id: 'preset_analyst',
    name: 'Market Analyst',
    role: 'analyst',
    skill: 'market_analysis',
    skill_level: 6,
    passive_income_rate: 1500,
    schedule_type: 'cron',
    schedule_cron: '0 * * * *',
    system_instructions: 'Track commodity price fluctuations and recommend buy/sell actions.',
    task_parameters: { commodities: ['drugs', 'weapons', 'electronics'], risk_tolerance: 'medium' },
    isPreset: true,
  },
];

export default function AIEmployeeTemplates({ onApplyTemplate }) {
  const [templates, setTemplates] = useState(loadTemplates());
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    role: '',
    skill: '',
    skill_level: 1,
    passive_income_rate: 500,
    schedule_type: 'interval',
    schedule_interval_mins: 60,
    schedule_cron: '0 * * * *',
    system_instructions: '',
    task_parameters: '{}',
  });

  const allTemplates = [...PRESET_TEMPLATES, ...templates];

  const handleSave = () => {
    if (!newTemplate.name.trim()) return;
    let task_parameters = {};
    try { task_parameters = JSON.parse(newTemplate.task_parameters); } catch {}
    const t = {
      ...newTemplate,
      task_parameters,
      id: `custom_${Date.now()}`,
      isPreset: false,
    };
    const updated = [...templates, t];
    setTemplates(updated);
    saveTemplates(updated);
    setShowSaveForm(false);
    setNewTemplate({ name: '', role: '', skill: '', skill_level: 1, passive_income_rate: 500, schedule_type: 'interval', schedule_interval_mins: 60, schedule_cron: '0 * * * *', system_instructions: '', task_parameters: '{}' });
  };

  const handleDelete = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <BookTemplate className="w-4 h-4 text-purple-400" />
          Configuration Templates
        </h3>
        <Button size="sm" onClick={() => setShowSaveForm(!showSaveForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
          <Plus className="w-3 h-3 mr-1" /> New Template
        </Button>
      </div>

      {showSaveForm && (
        <Card className="glass-panel border-purple-500/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-purple-300 font-semibold uppercase tracking-wide">Save New Template</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Template Name *</label>
                <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Night Shift Manager" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Role</label>
                <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newTemplate.role} onChange={e => setNewTemplate(p => ({ ...p, role: e.target.value }))} placeholder="e.g. logistics" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Skill</label>
                <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newTemplate.skill} onChange={e => setNewTemplate(p => ({ ...p, skill: e.target.value }))} placeholder="e.g. supply_chain" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Skill Level (1–10)</label>
                <input type="number" min="1" max="10" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newTemplate.skill_level} onChange={e => setNewTemplate(p => ({ ...p, skill_level: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Income Rate ($/hr)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newTemplate.passive_income_rate} onChange={e => setNewTemplate(p => ({ ...p, passive_income_rate: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Schedule Type</label>
                <select className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={newTemplate.schedule_type} onChange={e => setNewTemplate(p => ({ ...p, schedule_type: e.target.value }))}>
                  <option value="interval">Interval (minutes)</option>
                  <option value="cron">Cron Expression</option>
                </select>
              </div>
              {newTemplate.schedule_type === 'interval' ? (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Interval (mins)</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    value={newTemplate.schedule_interval_mins} onChange={e => setNewTemplate(p => ({ ...p, schedule_interval_mins: parseInt(e.target.value) || 60 }))} />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Cron Expression</label>
                  <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white font-mono"
                    value={newTemplate.schedule_cron} onChange={e => setNewTemplate(p => ({ ...p, schedule_cron: e.target.value }))} placeholder="0 * * * *" />
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">System Instructions</label>
              <textarea rows={2} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white resize-none"
                value={newTemplate.system_instructions} onChange={e => setNewTemplate(p => ({ ...p, system_instructions: e.target.value }))} placeholder="Describe what this AI employee should do..." />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Task Parameters (JSON)</label>
              <input className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white font-mono"
                value={newTemplate.task_parameters} onChange={e => setNewTemplate(p => ({ ...p, task_parameters: e.target.value }))} placeholder='{"key": "value"}' />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => setShowSaveForm(false)}>Cancel</Button>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSave}>
                <Save className="w-3 h-3 mr-1" /> Save Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allTemplates.map(template => (
          <Card key={template.id} className="glass-panel border-slate-600/30 hover:border-purple-500/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-semibold text-sm">{template.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{template.role} · Skill Lv {template.skill_level}</p>
                </div>
                <div className="flex items-center gap-1">
                  {template.isPreset && <Badge className="bg-blue-700 text-xs">Preset</Badge>}
                  {!template.isPreset && (
                    <button onClick={() => handleDelete(template.id)} className="text-gray-500 hover:text-red-400 p-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2 line-clamp-2">{template.system_instructions}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-xs text-gray-500">
                  <span>${template.passive_income_rate}/hr</span>
                  <span>·</span>
                  <span>{template.schedule_type === 'interval' ? `Every ${template.schedule_interval_mins}m` : template.schedule_cron}</span>
                </div>
                <Button size="sm" className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-xs"
                  onClick={() => onApplyTemplate(template)}>
                  <Download className="w-3 h-3 mr-1" /> Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}