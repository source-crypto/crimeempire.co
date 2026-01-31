import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Palette, Grid, Zap, Plus } from 'lucide-react';
import { toast } from 'sonner';

const facilitySize = 80;
const gridSize = 12;
const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#fbbf24'];
const materials = ['metal', 'concrete', 'glass', 'reinforced'];

export default function BaseLayoutDesigner({ selectedBase }) {
  const queryClient = useQueryClient();
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [draggedFacility, setDraggedFacility] = useState(null);

  const { data: facilities = [] } = useQuery({
    queryKey: ['baseFacilities', selectedBase?.id],
    queryFn: () => base44.entities.BaseFacility.filter({ base_id: selectedBase.id }),
    enabled: !!selectedBase?.id
  });

  const updateFacilityMutation = useMutation({
    mutationFn: (facility) => base44.entities.BaseFacility.update(facility.id, facility),
    onSuccess: () => {
      queryClient.invalidateQueries(['baseFacilities']);
      toast.success('Facility updated!');
    }
  });

  const handleDragStart = (e, facility) => {
    setDraggedFacility(facility);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, row, col) => {
    e.preventDefault();
    if (!draggedFacility || !editMode) return;

    updateFacilityMutation.mutate({
      ...draggedFacility,
      grid_position: { row, col, rotation: draggedFacility.grid_position?.rotation || 0 }
    });

    setDraggedFacility(null);
  };

  const handleColorChange = (facility, color) => {
    updateFacilityMutation.mutate({
      ...facility,
      aesthetics: { ...facility.aesthetics, color }
    });
  };

  const handleRotate = (facility) => {
    const newRotation = ((facility.grid_position?.rotation || 0) + 90) % 360;
    updateFacilityMutation.mutate({
      ...facility,
      grid_position: { ...facility.grid_position, rotation: newRotation }
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="glass-panel border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white text-sm">
            <span className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-blue-400" />
              Layout Designer
            </span>
            <Button
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className={editMode ? 'bg-green-600' : 'bg-gray-600'}
            >
              {editMode ? 'Save' : 'Edit'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400">
          {editMode ? 'Drag facilities to reposition, click to customize' : 'Select Edit to move facilities'}
        </CardContent>
      </Card>

      {/* Grid Layout */}
      <Card className="glass-panel border-cyan-500/20">
        <CardContent className="p-3">
          <div
            className="bg-slate-950 rounded border border-cyan-500/30 p-2"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              gap: '2px',
              aspectRatio: '1'
            }}
          >
            {Array(gridSize * gridSize).fill(null).map((_, idx) => {
              const row = Math.floor(idx / gridSize);
              const col = idx % gridSize;
              const facility = facilities.find(f => f.grid_position?.row === row && f.grid_position?.col === col);

              return (
                <div
                  key={idx}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, row, col)}
                  className="bg-slate-800/30 border border-slate-700 rounded hover:bg-slate-800/50 transition-colors relative"
                >
                  {facility && (
                    <div
                      draggable={editMode}
                      onDragStart={(e) => handleDragStart(e, facility)}
                      onClick={() => setSelectedFacility(facility)}
                      className={`w-full h-full rounded flex items-center justify-center cursor-pointer text-xs font-semibold transition-all ${
                        selectedFacility?.id === facility.id ? 'ring-2 ring-yellow-400' : ''
                      }`}
                      style={{
                        backgroundColor: facility.aesthetics?.color || '#3b82f6',
                        transform: `rotate(${facility.grid_position?.rotation || 0}deg)`,
                        opacity: facility.operational ? 1 : 0.5
                      }}
                    >
                      <span className="text-white drop-shadow">
                        {facility.facility_type.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Facility Customizer */}
      {selectedFacility && (
        <Card className="glass-panel border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <Palette className="w-4 h-4 text-purple-400" />
              {selectedFacility.facility_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Facility Info */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-gray-400">Type</p>
                <p className="text-purple-400 font-semibold capitalize">{selectedFacility.facility_type}</p>
              </div>
              <div className="p-2 bg-slate-800/50 rounded">
                <p className="text-gray-400">Level</p>
                <p className="text-yellow-400 font-semibold">{selectedFacility.level}</p>
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">Color</p>
              <div className="grid grid-cols-8 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(selectedFacility, color)}
                    className="w-8 h-8 rounded border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: selectedFacility.aesthetics?.color === color ? '#fbbf24' : 'transparent'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Material */}
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">Material</p>
              <div className="flex gap-1">
                {materials.map((material) => (
                  <button
                    key={material}
                    onClick={() => updateFacilityMutation.mutate({
                      ...selectedFacility,
                      aesthetics: { ...selectedFacility.aesthetics, material }
                    })}
                    className={`px-2 py-1 rounded text-xs capitalize transition-all ${
                      selectedFacility.aesthetics?.material === material
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                    }`}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>

            {/* Rotation */}
            {editMode && (
              <Button
                onClick={() => handleRotate(selectedFacility)}
                className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-xs"
              >
                Rotate (Current: {selectedFacility.grid_position?.rotation || 0}°)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Facilities List */}
      <Card className="glass-panel border-green-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Placed Facilities ({facilities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {facilities.map((facility) => (
              <div
                key={facility.id}
                onClick={() => setSelectedFacility(facility)}
                className="p-2 bg-slate-900/50 rounded cursor-pointer hover:bg-slate-900/70 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: facility.aesthetics?.color || '#3b82f6' }}
                  />
                  <span className="text-white font-semibold">{facility.facility_name}</span>
                </div>
                <Badge className={facility.operational ? 'bg-green-600' : 'bg-red-600'}>
                  {facility.operational ? 'Active' : 'Offline'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}