import AnatomicalHeart from './components/AnatomicalHeart';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-6">
        <h1 className="text-4xl font-bold text-red-500">PULSE</h1>
        <p className="text-gray-400 mt-2">Edinburgh's Anatomical City Heart</p>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Info Panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-3">Vessel Legend</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600"></div>
              <span>Aorta (Main Artery)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600"></div>
              <span>Pulmonary Arteries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400"></div>
              <span>Vena Cava (Veins)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-300"></div>
              <span>Coronary Arteries</span>
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-3">
            Future: Traffic flow = Aorta • Transit = Pulmonary • Social = Coronary
          </p>
        </div>
        
        {/* Anatomical Heart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-xl font-bold">Anatomical Heart Wireframe</h2>
            <p className="text-gray-400 text-sm mt-1">
              Chambers & vessels ready for data flow • Drag to rotate
            </p>
          </div>
          <AnatomicalHeart />
        </div>
        
        {/* Data Mapping Plan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <DataFlowCard
            vessel="Aorta"
            color="#ff0000"
            dataType="Traffic Flow"
            description="Main arterial roads, flow speed"
          />
          <DataFlowCard
            vessel="Pulmonary Arteries"
            color="#6666ff"
            dataType="Public Transit"
            description="Bus/train routes, capacity"
          />
          <DataFlowCard
            vessel="Coronary Arteries"
            color="#ff9999"
            dataType="Social Activity"
            description="Twitter, events, gatherings"
          />
        </div>
      </main>
    </div>
  );
}

function DataFlowCard({ vessel, color, dataType, description }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-8 h-8 rounded" 
          style={{ backgroundColor: color }}
        ></div>
        <div>
          <div className="font-bold">{vessel}</div>
          <div className="text-xs text-gray-500">{dataType}</div>
        </div>
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

export default App;