import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, KeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import Veiculo from './components/Veiculo'
import Terreno from './components/Terreno'

const configpadrao = {
  dimensoes: {
    largura: 10.0,
    comprimento: 20.0,
    alturachao: 2.0,
    alturaporta: 4.5,
    alturaparabrisa: 4.5,
    comprimentorodas: 13.0,
    taxaBaseCockpitTras: 0.1,
    taxaTopoCockpitTras: 0.2,
    taxaTopoCockpitFrente: 0.6,
    taxaBaseCockpitFrente: 0.7
  },
  rodas: {
    raio: 2.0,
    largura: 1.5,
    segmentos: 16
  },
  fisica: {
    aceleracao: 0.01,
    desaceleracao: 0.95,
    velmax: 1.0,
    velmin: -0.25,
    velvolante: 0.02,
    limitevolante: 0.7
  }
}

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
  const [carros, setCarros] = useState([
    { id: 1, matiz: 0.0, pos: [0, 0, 0] }
  ])

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
      <div style={{ position: 'absolute', zIndex: 10, padding: '20px' }}>
        <button onClick={gerarCarro} style={{ padding: '10px', cursor: 'pointer' }}>
          gerar carro
        </button>
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
              config={configpadrao}
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