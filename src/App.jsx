import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, KeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import Veiculo from './components/Veiculo'
import Terreno from './components/Terreno'
import './App.css'

const geraCorCarro = (quantidade) => {
  const grupo = Math.floor(quantidade / 4)
  const posicaonogrupo = quantidade % 4

  let n = grupo
  let offset = 0.0
  let fracao = 0.5

  while (n > 0) {
    if (n % 2 === 1) {
      offset += fracao
    }
    n = Math.floor(n / 2)
    fracao *= 0.5
  }

  return (0.25 * posicaonogrupo) + (0.25 * offset)
}

export default function App() {

  const [config, setConfig] = useState({
    dimensoes: {
      largura: 10.0,
      comprimento: 45.0,
      alturachao: 2.0,
      alturaporta: 5.5,
      alturaparabrisa: 4.5,
      comprimentorodas: 43.0,
      taxaBaseCockpitTras: 0.75,
      taxaTopoCockpitTras: 0.8,
      taxaTopoCockpitFrente: 0.95,
      taxaBaseCockpitFrente: 1.0
    },
    rodas: {
      raio: 2.0,
      largura: 1.5,
      segmentos: 16
    },
    fisica: {
      aceleracao: 0.01,
      desaceleracao: 0.95,
      velmax: 10.0,
      velmin: -0.25,
      velvolante: 0.02,
      limitevolante: 0.7
    }
  })

  const [carros, setCarros] = useState([
    { id: 1, matiz: 0.0, pos: [0, 0, 0] }
  ])

  const atualizarConfig = (categoria, chave, valor) => {
    setConfig(anterior => ({
      ...anterior,
      [categoria]: {
        ...anterior[categoria],
        [chave]: parseFloat(valor) || 0
      }
    }))
  }

  const [showConfigCarro, setShowConfigCarro] = useState(false)
  const [showConfigTerreno, setShowConfigTerreno] = useState(false)

  const gerarCarro = () => {
    setCarros(antigos => {
      const quantidade = antigos.length
      const novomatiz = geraCorCarro(quantidade)

      return [
        ...antigos,
        {
          id: quantidade + 1,
          matiz: novomatiz,
          pos: [Math.random() * 80 - 40, 0, Math.random() * 80 - 40]
        }
      ]
    })
  }

  const teclas = [
    { name: 'frente', keys: ['ArrowUp', 'KeyW'] },
    { name: 'tras', keys: ['ArrowDown', 'KeyS'] },
    { name: 'esquerda', keys: ['ArrowLeft', 'KeyA'] },
    { name: 'direita', keys: ['ArrowRight', 'KeyD'] },
    { name: 'camera', keys: ['KeyC', 'c'] },
    { name: 'wireframe', keys: ['KeyM', 'm'] },
    { name: 'pontos', keys: ['KeyP', 'p'] }
  ]

  return (
    <KeyboardControls map={teclas}>
      <div className='telaJogo'>
        <div className='telaJogo__colunaMenu'>
          <button onClick={gerarCarro} class="frutiger-button">
            <div class="inner">
              <div class="top-white"></div>
              <span class="text">carro config</span>
            </div>
          </button>
          <button onClick={gerarCarro} class="frutiger-button">
            <div class="inner">
              <div class="top-white"></div>
              <span class="text">terreno config</span>
            </div>
          </button>
          <button onClick={gerarCarro} class="frutiger-button">
            <div class="inner">
              <div class="top-white"></div>
              <span class="text">gerar carro</span>
            </div>
          </button>
        </div>
        <div className='telaJogo__colunaMenuAtivo'>
          <div className='telaJogo__colunaMenuAtivo__inner'>
            <div className='telaJogo__colunaMenuAtivo__inner__inputgroup'>
              <label>largura</label>
              <input
                type='number'
                value={config.dimensoes.largura}
                onChange={(e) => atualizarConfig('dimensoes', 'largura', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: '100vw', height: '100vh', margin: 0, overflow: 'hidden' }}>
        <Canvas camera={{ position: [0, 120, 200], fov: 60 }}>
          <color attach="background" args={['#87ceeb']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[100, 200, 100]} />

          {carros.map(carro => (
            <Veiculo
              key={carro.id}
              matiz={carro.matiz}
              posicaoInicial={carro.pos}
              config={config}
            />
          ))}

          <Terreno />

          <OrbitControls
            mouseButtons={{
              LEFT: THREE.MOUSE.PAN,
              RIGHT: THREE.MOUSE.ROTATE
            }}
            screenSpacePanning={false}
          />
        </Canvas>
      </div>
    </KeyboardControls>
  )
}