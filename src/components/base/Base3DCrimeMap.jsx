import React, { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as THREE from 'three';
import { MapPin, Zap } from 'lucide-react';

export default function Base3DCrimeMap({ bases = [], playerLocation = { x: 50, y: 50 } }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const [selectedBase, setSelectedBase] = useState(null);

  useEffect(() => {
    if (!containerRef.current || !bases.length) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(50, 80, 50);
    camera.lookAt(50, 0, 50);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(100, 10, 0x444444, 0x222222);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Add bases
    bases.forEach((base) => {
      const pos = base.location || { x: Math.random() * 100, y: Math.random() * 100, z: 0 };
      
      // Base structure
      const baseGeometry = new THREE.BoxGeometry(8, 3, 8);
      const baseColor = base.maintenance_health > 70 ? 0x22c55e :
                       base.maintenance_health > 40 ? 0xeab308 : 0xef4444;
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.5,
        metalness: 0.5
      });
      const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
      baseMesh.position.set(pos.x, 1.5, pos.y);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      baseMesh.userData = { baseId: base.id };
      scene.add(baseMesh);

      // Security radius
      const radiusGeometry = new THREE.CircleGeometry(15, 32);
      const radiusMaterial = new THREE.MeshStandardMaterial({
        color: base.security_level > 70 ? 0x3b82f6 : 0x84cc16,
        transparent: true,
        opacity: 0.2
      });
      const radiusMesh = new THREE.Mesh(radiusGeometry, radiusMaterial);
      radiusMesh.rotation.x = -Math.PI / 2;
      radiusMesh.position.set(pos.x, 0.01, pos.y);
      scene.add(radiusMesh);
    });

    // Player position
    const playerGeometry = new THREE.SphereGeometry(2, 32, 32);
    const playerMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.5
    });
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.position.set(playerLocation.x, 1, playerLocation.y);
    playerMesh.castShadow = true;
    scene.add(playerMesh);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Rotate bases
      scene.children.forEach((child) => {
        if (child.userData.baseId) {
          child.rotation.y += 0.01;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [bases, playerLocation]);

  return (
    <div className="space-y-3">
      <Card className="glass-panel border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <MapPin className="w-4 h-4 text-cyan-400" />
            3D Crime Territory Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className="w-full rounded-lg border border-cyan-500/20 overflow-hidden"
            style={{ height: '400px', background: '#0f172a' }}
          />
          <div className="mt-3 flex gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-400">Good Health</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-400">Damaged</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-400">Critical</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <span className="text-gray-400">You</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Base List */}
      <Card className="glass-panel border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Located Bases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {bases.map((base) => (
              <div
                key={base.id}
                onClick={() => setSelectedBase(base)}
                className="p-2 bg-slate-900/50 rounded cursor-pointer hover:bg-slate-900/70 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">{base.base_name}</span>
                  <Badge className="bg-purple-600 text-xs">Lvl {base.level}</Badge>
                </div>
                <p className="text-gray-400 text-[10px]">Security: {base.security_level}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Base Details */}
      {selectedBase && (
        <Card className="glass-panel border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-sm">
              <Zap className="w-4 h-4 text-blue-400" />
              {selectedBase.base_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-1.5 bg-slate-800/50 rounded">
                <p className="text-gray-400">Type</p>
                <p className="text-blue-400 font-semibold capitalize">{selectedBase.base_type}</p>
              </div>
              <div className="p-1.5 bg-slate-800/50 rounded">
                <p className="text-gray-400">Threat</p>
                <p className={`font-semibold ${selectedBase.vulnerability_rating > 70 ? 'text-red-400' : 'text-green-400'}`}>
                  {selectedBase.vulnerability_rating}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}