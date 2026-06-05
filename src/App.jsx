import { useState } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, KeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import Veiculo from './components/Veiculo'
import Terreno from './components/Terreno'
import './App.css'
import fundoUrl from './fundo.jpg'

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

function InputConfig({ rotulo, categoria, chave, config, atualizar }) {
  let passo = 1
  if (categoria === 'fisica' || rotulo.toLowerCase().includes('taxa') || rotulo.toLowerCase().includes('fator') || rotulo.toLowerCase().includes('escala') || rotulo.toLowerCase().includes('ratio')) {
    passo = 0.1
  }

  const valorAtual = config[categoria][chave];

  if (Array.isArray(valorAtual)) {
    return (
      <div className='telaJogo__colunaMenuAtivo__inner__inputgroup'>
        <label>{rotulo} (x, y, z)</label>
          {valorAtual.map((v, index) => (
            <input
              key={index}
              type='number'
              step={passo}
              value={v}
              onChange={(e) => {
                const novoArray = [...valorAtual];
                novoArray[index] = parseFloat(e.target.value) || 0;
                atualizar(categoria, chave, novoArray);
              }}
            />
          ))}
      </div>
    )
  }
  return (
    <div className='telaJogo__colunaMenuAtivo__inner__inputgroup'>
      <label>{rotulo}</label>
      <input
        type='number'
        step={passo}
        value={valorAtual}
        onChange={(e) => atualizar(categoria, chave, e.target.value)}
      />
    </div>
  )
}

function FundoImagem() {
  const textura = useLoader(THREE.TextureLoader, fundoUrl)
  textura.colorSpace = THREE.SRGBColorSpace
  textura.wrapS = THREE.ClampToEdgeWrapping
  textura.wrapT = THREE.ClampToEdgeWrapping
  textura.repeat.set(1, 0.8)
  textura.offset.y = -0.2

  return <primitive attach="background" object={textura} />
}

const criarAtualizador = (setEstado) => (categoria, chave, valor) => {
  setEstado(anterior => ({
    ...anterior,
    [categoria]: {
      ...anterior[categoria],
      [chave]: Array.isArray(valor) ? valor : parseFloat(valor) || 0
    }
  }))
}

export default function App() {

  const [config, setConfig] = useState({
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
  })

  const [configTerreno, setConfigTerreno] = useState({
    parametros: {
      ptcontrole: 10,
      subdivisoes: 32,
      espacamento: 140.0,
      ondulacao: 140.0,
      fatorborda: 0.3
    },
    visualizacao: {
      fatorOpacidade: 1.0,
    }
  })

  const [configArvore, setConfigArvore] = useState({
    arvores: {
      quantidade: 50,
      alturaTronco: 40.0,
      alturaTroncoRandExtra: 50.0,
      raioTronco: 5.0,
      raioTroncoRandExtra: 3.0,
      inclinacaoMax: 0.15,
      segmentosTronco: 7,
      copaMinEsferas: 3,
      copaMaxExtraEsferas: 3,
      raioEsfera: 30.0,
      raioEsferaRandExtra: 20.0,
      segmentosEsfera: 8,
      espalhamentoCopa: 100.0,
      offsetYCopaRand: 0.6,
      escalaCopaBase: [1.0, 0.6, 1.0],
      escalaCopaRand: [0.4, 0.3, 0.4],
      segmentosGalho: 5,
      galhoAlturaMinBaseRatio: 0.3,
      galhoAlturaRatioRandExtra: 0.25,
      galhoRaioBaseRatio: 0.4,
      galhoRaioPontaRatio: 0.15
    }
  })

  const [configGrama, setConfigGrama] = useState({
    grama: {
      quantidade: 10000,
      altura: 6.0,
      raio: 2.0,
      segmentos: 2
    }
  })

  const atualizarConfig = criarAtualizador(setConfig)
  const atualizarConfigTerreno = criarAtualizador(setConfigTerreno)
  const atualizarConfigArvore = criarAtualizador(setConfigArvore)
  const atualizarConfigGrama = criarAtualizador(setConfigGrama)

  const [carros, setCarros] = useState([
    { id: 1, matiz: 0.0, pos: [0, 0, 0] }
  ])

  const [showConfigCarro, setShowConfigCarro] = useState(false)
  const [showConfigTerreno, setShowConfigTerreno] = useState(false)
  const [showConfigArvore, setShowConfigArvore] = useState(false)
  const [showConfigGrama, setShowConfigGrama] = useState(false)

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
          <button onClick={() => setShowConfigCarro(!showConfigCarro)} className="frutiger-button">
            <div className="inner">
              <div className="top-white"></div>
              <span className="text">carro config</span>
            </div>
          </button>
          <button onClick={() => setShowConfigTerreno(!showConfigTerreno)} className="frutiger-button">
            <div className="inner">
              <div className="top-white"></div>
              <span className="text">terreno config</span>
            </div>
          </button>
          <button onClick={() => setShowConfigArvore(!showConfigArvore)} className="frutiger-button">
            <div className="inner">
              <div className="top-white"></div>
              <span className="text">arvore config</span>
            </div>
          </button>
          <button onClick={() => setShowConfigGrama(!showConfigGrama)} className="frutiger-button">
            <div className="inner">
              <div className="top-white"></div>
              <span className="text">grama config</span>
            </div>
          </button>
          <button onClick={gerarCarro} className="frutiger-button">
            <div className="inner">
              <div className="top-white"></div>
              <span className="text">gerar carro</span>
            </div>
          </button>
        </div>
        {showConfigCarro && (
          <div className='telaJogo__colunaMenuAtivo'>
            <div className='telaJogo__colunaMenuAtivo__inner'>
              {Object.entries(config).map(([categoria, propriedades]) => (
                <div key={categoria} style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {categoria}
                  </div>
                  {Object.keys(propriedades).map(chave => (
                    <InputConfig
                      key={`${categoria}-${chave}`}
                      rotulo={chave}
                      categoria={categoria}
                      chave={chave}
                      config={config}
                      atualizar={atualizarConfig}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {showConfigTerreno && (
          <div className='telaJogo__colunaMenuAtivo'>
            <div className='telaJogo__colunaMenuAtivo__inner'>
              {Object.entries(configTerreno).map(([categoria, propriedades]) => (
                <div key={categoria} className='telaJogo__colunaMenuAtivo__inner__categoria'>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {categoria}
                  </div>
                  {Object.keys(propriedades).map(chave => (
                    <InputConfig
                      key={`${categoria}-${chave}`}
                      rotulo={chave}
                      categoria={categoria}
                      chave={chave}
                      config={configTerreno}
                      atualizar={atualizarConfigTerreno}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {showConfigArvore && (
          <div className='telaJogo__colunaMenuAtivo'>
            <div className='telaJogo__colunaMenuAtivo__inner'>
              {Object.entries(configArvore).map(([categoria, propriedades]) => (
                <div key={categoria} className='telaJogo__colunaMenuAtivo__inner__categoria'>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {categoria}
                  </div>
                  {Object.keys(propriedades).map(chave => (
                    <InputConfig
                      key={`${categoria}-${chave}`}
                      rotulo={chave}
                      categoria={categoria}
                      chave={chave}
                      config={configArvore}
                      atualizar={atualizarConfigArvore}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {showConfigGrama && (
          <div className='telaJogo__colunaMenuAtivo'>
            <div className='telaJogo__colunaMenuAtivo__inner'>
              {Object.entries(configGrama).map(([categoria, propriedades]) => (
                <div key={categoria} className='telaJogo__colunaMenuAtivo__inner__categoria'>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {categoria}
                  </div>
                  {Object.keys(propriedades).map(chave => (
                    <InputConfig
                      key={`${categoria}-${chave}`}
                      rotulo={chave}
                      categoria={categoria}
                      chave={chave}
                      config={configGrama}
                      atualizar={atualizarConfigGrama}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '100vw', height: '100vh', margin: 0, overflow: 'hidden' }}>
        <Canvas camera={{ position: [-400, 120, 400], fov: 60, near: 0.1, far: 15000 }}>
          <FundoImagem />
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

          <Terreno config={configTerreno} arvconfig={configArvore} gramaconfig={configGrama}/>

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