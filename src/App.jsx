import { useState, useEffect, useRef, Suspense } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, KeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import Veiculo from './components/Veiculo'
import Terreno from './components/Terreno'
import './App.css'
import fundoUrl from './fundo.jpg'
import { TerrenoState } from './components/Terreno'

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

  return 0.25 * posicaonogrupo + 0.25 * offset
}

function useArrastoInfinito({ valorAtual, aoMudar, passo }) {
  const refValor = useRef(valorAtual)
  refValor.current = valorAtual

  const iniciarArrasto = (e) => {
    if (e.button !== 0) return

    const elemento = e.currentTarget

    if (elemento.requestPointerLock) {
      elemento.requestPointerLock()
    }

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.movementX || 0
      if (delta !== 0) {
        const novo = refValor.current + delta * passo
        aoMudar(Number(novo.toFixed(4)))
      }
    }

    const onMouseUp = () => {
      if (document.exitPointerLock) {
        document.exitPointerLock()
      }
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return iniciarArrasto
}

function InputConfig({ rotulo, categoria, chave, config, atualizar }) {
  let passo = 0.5
  const chaveLower = chave.toLowerCase()
  if (
    categoria === 'fisica' ||
    chaveLower.includes('taxa') ||
    chaveLower.includes('fator') ||
    chaveLower.includes('escala') ||
    chaveLower.includes('ratio') ||
    chaveLower.includes('aceleracao') ||
    chaveLower.includes('atrito') ||
    chaveLower.includes('ruido') ||
    chaveLower.includes('inclinacao') ||
    chaveLower.includes('opacidade')
  ) {
    passo = 0.005
  } else if (chaveLower.includes('quantidade') || chaveLower.includes('segmentos') || chaveLower.includes('subdivisoes')) {
    passo = 1
  }

  const valorAtual = config[categoria][chave]

  const estiloLabelArrastavel = {
    cursor: 'ew-resize',
    userSelect: 'none',
    display: 'inline-block'
  }

  if (Array.isArray(valorAtual)) {
    const eixos = ['X', 'Y', 'Z']
    return (
      <div className="telaJogo__colunaMenuAtivo__inner__inputgroup">
        <label style={{ userSelect: 'none' }}>{rotulo} (arraste os eixos):</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {valorAtual.map((v, index) => {
            const onMouseDownEixo = useArrastoInfinito({
              valorAtual: v,
              passo,
              aoMudar: (novoValor) => {
                const novoArray = [...valorAtual]
                novoArray[index] = novoValor
                atualizar(categoria, chave, novoArray)
              }
            })

            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  onMouseDown={onMouseDownEixo}
                  style={{ ...estiloLabelArrastavel, fontWeight: 'bold', fontSize: '11px', color: '#888' }}
                  title="Clique e arraste para alterar"
                >
                  {eixos[index] || index}:
                </span>
                <input
                  type="number"
                  step={passo}
                  value={v}
                  onChange={(e) => {
                    const novoArray = [...valorAtual]
                    novoArray[index] = parseFloat(e.target.value) || 0
                    atualizar(categoria, chave, novoArray)
                  }}
                  style={{ width: '60px' }}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Hook de arrasto para propriedades numéricas comuns
  const onMouseDownLabel = useArrastoInfinito({
    valorAtual: Number(valorAtual) || 0,
    passo,
    aoMudar: (novoValor) => atualizar(categoria, chave, novoValor)
  })

  return (
    <div className="telaJogo__colunaMenuAtivo__inner__inputgroup">
      <label
        onMouseDown={onMouseDownLabel}
        style={estiloLabelArrastavel}
        title="Clique e arraste para a esquerda/direita para alterar"
      >
        {rotulo}
      </label>
      <input
        type="number"
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

export default function App() {
  const [config, setConfig] = useState({
    carro: {
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
        aceleracao: 0.0025,
        aceleracaoFreio: 0.01,
        velmax: 2.0,
        velmaxre: -0.25,
        velocidadeVolante: 0.01,
        anguloVolanteMax: 0.7,
        aderenciaPista: 0.01,
        atritoEscalar: 0.9999,
        atritoLinear: 0.002
      }
    },
    terreno: {
      parametros: {
        ptcontrole: 10,
        subdivisoes: 32,
        espacamento: 1000.0,
        ondulacao: 1000.0,
        fatorborda: 0.3,
        repeticoesTextura: 200.0
      },
      visualizacao: {
        fatorOpacidade: 1.0
      }
    },
    arvore: {
      arvores: {
        quantidade: 1000,
        alturaTronco: 100.0,
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
        galhoRaioPontaRatio: 0.15,
        distanciaEstrada: 20.0
      }
    },
    grama: {
      grama: {
        quantidade: 100000,
        altura: 16.0,
        raio: 22.0,
        segmentos: 2,
        distanciaEstrada: 30.0
      }
    },
    moita: {
      moita: {
        quantidade: 2000,
        altura: 40.0,
        raio: 30.0,
        distanciaEstrada: 50.0
      }
    },
    estrada: {
      estrada: {
        largura: 80.0,
        quantidadePontosControle: 20.0,
        raioBase: 0.35,
        quantidadeRuido: 0.5,
        offsetElevacao: 0.7
      }
    }
  })

  const [abaAtiva, setAbaAtiva] = useState(null)
  const [carros, setCarros] = useState([])
  const [cameraLivre, setCameraLivre] = useState(false)

  useEffect(() => {
    const intervalo = setInterval(() => {
      if (TerrenoState.pontosEstrada && TerrenoState.pontosEstrada.length > 0) {
        const p = TerrenoState.pontosEstrada[0]
        setCarros([{ id: 1, matiz: 0.0, pos: [p.x, p.y + 3, p.z] }])
        clearInterval(intervalo)
      }
    }, 100)
    return () => clearInterval(intervalo)
  }, [])

  const atualizarConfigGeral = (aba, categoria, chave, valor) => {
    setConfig((prev) => ({
      ...prev,
      [aba]: {
        ...prev[aba],
        [categoria]: {
          ...prev[aba][categoria],
          [chave]: Array.isArray(valor) ? valor : parseFloat(valor) || 0
        }
      }
    }))
  }

  const gerarCarro = () => {
    setCarros((antigos) => {
      const quantidade = antigos.length
      const novomatiz = geraCorCarro(quantidade)

      let novaPosicao = [0, 10, 0]
      if (TerrenoState.pontosEstrada && TerrenoState.pontosEstrada.length > 0) {
        const indiceAleatorio = Math.floor(Math.random() * TerrenoState.pontosEstrada.length)
        const p = TerrenoState.pontosEstrada[indiceAleatorio]
        novaPosicao = [p.x, p.y + 3, p.z]
      } else {
        novaPosicao = [Math.random() * 80 - 40, 10, Math.random() * 80 - 40]
      }

      return [
        ...antigos,
        {
          id: Date.now(),
          matiz: novomatiz,
          pos: novaPosicao
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
      <div className="telaJogo">
        <div className="telaJogo__colunaMenu">
          {Object.keys(config).map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(abaAtiva === aba ? null : aba)}
              className="frutiger-button"
            >
              <div className="inner">
                <div className="top-white"></div>
                <span className="text">{aba} config</span>
              </div>
            </button>
          ))}

          <button onClick={gerarCarro} className="frutiger-button">
            <div className="inner">
              <div className="top-white"></div>
              <span className="text">gerar carro</span>
            </div>
          </button>

          <button onClick={() => setCameraLivre(!cameraLivre)} className="frutiger-button">
            <div className="inner">
              <div className="top-white"></div>
              <span className="text">{cameraLivre ? 'seguir carro' : 'câmera livre'}</span>
            </div>
          </button>
        </div>

        {abaAtiva && (
          <div className="telaJogo__colunaMenuAtivo">
            <div className="telaJogo__colunaMenuAtivo__inner">
              {Object.entries(config[abaAtiva]).map(([categoria, propriedades]) => (
                <div
                  key={categoria}
                  className="telaJogo__colunaMenuAtivo__inner__categoria"
                  style={{ marginBottom: '15px' }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {categoria}
                  </div>
                  {Object.keys(propriedades).map((chave) => (
                    <InputConfig
                      key={`${categoria}-${chave}`}
                      rotulo={chave}
                      categoria={categoria}
                      chave={chave}
                      config={config[abaAtiva]}
                      atualizar={(cat, ch, val) => atualizarConfigGeral(abaAtiva, cat, ch, val)}
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

          {carros.map((carro) => (
            <Veiculo
              key={carro.id}
              matiz={carro.matiz}
              posicaoInicial={carro.pos}
              config={config.carro}
              segueCamera={!cameraLivre && carro.id === 1}
            />
          ))}

          <Suspense fallback={null}>
            <Terreno
              config={config.terreno}
              arvconfig={config.arvore}
              gramaconfig={config.grama}
              moitaconfig={config.moita}
              estradaconfig={config.estrada}
            />
          </Suspense>

          <OrbitControls
            makeDefault
            enablePan={cameraLivre}
            mouseButtons={{
              LEFT: cameraLivre ? THREE.MOUSE.PAN : null,
              RIGHT: THREE.MOUSE.ROTATE
            }}
            screenSpacePanning={false}
          />
        </Canvas>
      </div>
    </KeyboardControls>
  )
}