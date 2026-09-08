import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { obteralturaterrenoem, obternormalterrenoem } from './Terreno'
import { ModoDirecao } from '../App'

function Chassi({ matiz, dimensoes }) {
    const geometria = useMemo(() => {
        const metadeLargura = dimensoes.largura / 2
        const metadeComprimento = dimensoes.comprimento / 2
        const alturaChao = dimensoes.alturachao
        const alturaPorta = alturaChao + dimensoes.alturaporta
        const alturaParabrisa = dimensoes.alturaparabrisa
        const comprimento = dimensoes.comprimento

        const c = []

        c[0] = new THREE.Vector3(-metadeLargura, alturaChao, -metadeComprimento)
        c[1] = new THREE.Vector3(metadeLargura, alturaChao, -metadeComprimento)
        c[2] = new THREE.Vector3(metadeLargura, alturaChao, metadeComprimento)
        c[3] = new THREE.Vector3(-metadeLargura, alturaChao, metadeComprimento)

        c[4] = new THREE.Vector3(-metadeLargura, alturaPorta, -metadeComprimento)
        c[5] = new THREE.Vector3(metadeLargura, alturaPorta, -metadeComprimento)
        c[6] = new THREE.Vector3(metadeLargura, alturaPorta, metadeComprimento)
        c[7] = new THREE.Vector3(-metadeLargura, alturaPorta, metadeComprimento)

        c[8] = new THREE.Vector3(-metadeLargura, alturaPorta + alturaParabrisa, -metadeComprimento + (comprimento * dimensoes.taxaTopoCockpitTras))
        c[9] = new THREE.Vector3(metadeLargura, alturaPorta + alturaParabrisa, -metadeComprimento + (comprimento * dimensoes.taxaTopoCockpitTras))
        c[10] = new THREE.Vector3(metadeLargura, alturaPorta + alturaParabrisa, -metadeComprimento + (comprimento * dimensoes.taxaTopoCockpitFrente))
        c[11] = new THREE.Vector3(-metadeLargura, alturaPorta + alturaParabrisa, -metadeComprimento + (comprimento * dimensoes.taxaTopoCockpitFrente))

        c[12] = new THREE.Vector3(-metadeLargura, alturaPorta, -metadeComprimento + (comprimento * dimensoes.taxaBaseCockpitTras))
        c[13] = new THREE.Vector3(metadeLargura, alturaPorta, -metadeComprimento + (comprimento * dimensoes.taxaBaseCockpitTras))
        c[14] = new THREE.Vector3(metadeLargura, alturaPorta, -metadeComprimento + (comprimento * dimensoes.taxaBaseCockpitFrente))
        c[15] = new THREE.Vector3(-metadeLargura, alturaPorta, -metadeComprimento + (comprimento * dimensoes.taxaBaseCockpitFrente))

        const vertices = []

        const addQuad = (p1, p2, p3, p4) => {
            vertices.push(p1.x, p1.y, p1.z)
            vertices.push(p2.x, p2.y, p2.z)
            vertices.push(p3.x, p3.y, p3.z)

            vertices.push(p1.x, p1.y, p1.z)
            vertices.push(p3.x, p3.y, p3.z)
            vertices.push(p4.x, p4.y, p4.z)
        }

        addQuad(c[0], c[1], c[2], c[3])
        addQuad(c[4], c[5], c[6], c[7])
        addQuad(c[0], c[1], c[5], c[4])
        addQuad(c[3], c[2], c[6], c[7])
        addQuad(c[0], c[3], c[7], c[4])
        addQuad(c[1], c[2], c[6], c[5])

        addQuad(c[8], c[9], c[10], c[11])
        addQuad(c[8], c[9], c[13], c[12])
        addQuad(c[11], c[10], c[14], c[15])
        addQuad(c[8], c[11], c[15], c[12])
        addQuad(c[9], c[10], c[14], c[13])

        const arrayFloat = new Float32Array(vertices)
        const geo = new THREE.BufferGeometry()

        geo.setAttribute('position', new THREE.BufferAttribute(arrayFloat, 3))
        geo.computeVertexNormals()

        return geo
    }, [dimensoes])

    const cor = useMemo(() => {
        return new THREE.Color().setHSL(matiz, 1.0, 0.5)
    }, [matiz])

    return (
        <mesh geometry={geometria}>
            <meshStandardMaterial color={cor} side={THREE.DoubleSide} />
        </mesh>
    )
}

export default function Veiculo({ matiz = 0, posicaoInicial = [0, 0, 0], config, segueCamera = false, modoDirecao }) {
    const chassiRef = useRef()
    const rodaEsqFrenteRef = useRef()
    const rodaDirFrenteRef = useRef()
    const [, get] = useKeyboardControls()

    const [velocidade, setVelocidade] = useState(0)
    const [anguloVolante, setAnguloVolante] = useState(0)
    const [rotacaoCarro, setRotacaoCarro] = useState(0)

    const posAnterior = useRef(new THREE.Vector3(...posicaoInicial))
    const vetorMovimento = useRef(new THREE.Vector3(0, 0, 1))

    const isDragging = useRef(false)
    const angulosRelativos = useRef({ pitch: Math.PI / 3 })
    const initCam = useRef(false)

    useEffect(() => {
        const onPointerDown = (e) => {
            if (e.button === 2) isDragging.current = true
        }
        const onPointerUp = (e) => {
            if (e.button === 2) isDragging.current = false
        }
        window.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointerup', onPointerUp)
        return () => {
            window.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('pointerup', onPointerUp)
        }
    }, [])

    useFrame((state) => {
        const { frente, tras, esquerda, direita } = get()

        let velAtual = velocidade
        let anguloAtual = anguloVolante

        if (frente) {
            velAtual += config.fisica.aceleracao
            if (velAtual > config.fisica.velmax) velAtual = config.fisica.velmax
        } else if (tras) {
            if (velAtual > 0) {
                velAtual -= config.fisica.aceleracaoFreio
                if (velAtual < config.fisica.velmin) velAtual = config.fisica.velmin
            }
            else {
                velAtual -= config.fisica.aceleracao
                if (velAtual < config.fisica.velmaxre) velAtual = config.fisica.velmaxre
            }
        } else {
            velAtual *= config.fisica.atritoEscalar
            const atritoMecanico = config.fisica.atritoLinear;
            if (velAtual > atritoMecanico) {
                velAtual -= atritoMecanico;
            } else if (velAtual < -atritoMecanico) {
                velAtual += atritoMecanico;
            } else {
                velAtual = 0;
            }
        }

        let limiteVolanteDinamico = config.fisica.anguloVolanteMax;

        const aderenciaPista = config.fisica.aderenciaPista;
        const velParaCalculoAtrito = Math.max(0.0001, Math.abs(velAtual));
        let limiteAtritoPneu = (aderenciaPista * config.dimensoes.comprimentorodas) / (velParaCalculoAtrito * velParaCalculoAtrito);

        if (modoDirecao === ModoDirecao.DRIFT) {
            limiteAtritoPneu *= config.fisica.multiplicadorAnguloDrift;
        }

        limiteVolanteDinamico = Math.min(limiteVolanteDinamico, limiteAtritoPneu);

        let anguloAlvo = 0;

        if (esquerda) {
            anguloAlvo = limiteVolanteDinamico;
        } else if (direita) {
            anguloAlvo = -limiteVolanteDinamico;
        } else {
            anguloAlvo = 0;
        }
        console.log(anguloAlvo)
        const fatorSuavizacao = Math.min(1, 1000 * state.clock.getDelta());;
        anguloAtual = THREE.MathUtils.lerp(anguloAtual, anguloAlvo, fatorSuavizacao);

        setAnguloVolante(anguloAlvo)

        if (chassiRef.current) {
            const taxaGiro = (velAtual / config.dimensoes.comprimentorodas) * Math.tan(anguloAtual)
            let novaRotacao = rotacaoCarro + taxaGiro
            setRotacaoCarro(novaRotacao)

            const posX = chassiRef.current.position.x
            const posZ = chassiRef.current.position.z
            const cima = obternormalterrenoem(posX, posZ)

            const rotacaoVolante = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), novaRotacao)
            const inclinacaoChao = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), cima)
            const rotacaoFinal = new THREE.Quaternion().multiplyQuaternions(inclinacaoChao, rotacaoVolante)

            const vetorFrente = new THREE.Vector3(0, 0, 1).applyQuaternion(rotacaoFinal)

            if (modoDirecao === ModoDirecao.GRIP) {
                vetorMovimento.current.copy(vetorFrente)
            } else if (modoDirecao === ModoDirecao.DRIFT) {
                const aderenciaPista = config.fisica.aderenciaPista;
                vetorMovimento.current.lerp(vetorFrente, 0.01).normalize()
                const alinhamento = vetorMovimento.current.dot(vetorFrente)
                const escorregamento = 1 - Math.abs(alinhamento)
                velAtual -= velAtual * escorregamento * aderenciaPista
            }

            chassiRef.current.position.x += vetorMovimento.current.x * velAtual
            chassiRef.current.position.z += vetorMovimento.current.z * velAtual
            chassiRef.current.position.y = obteralturaterrenoem(chassiRef.current.position.x, chassiRef.current.position.z)
            chassiRef.current.quaternion.slerp(rotacaoFinal, 0.15)

            if (segueCamera && state.controls) {
                const alturaDaCamera = new THREE.Vector3(0, config.dimensoes.alturachao + config.dimensoes.alturaporta + config.dimensoes.alturaparabrisa)
                const alvoCamera = chassiRef.current.position.clone().add(alturaDaCamera)
                const deltaMove = new THREE.Vector3().subVectors(chassiRef.current.position, posAnterior.current)
                state.camera.position.add(deltaMove)

                const chassiQuat = chassiRef.current.quaternion
                const vetorCima = new THREE.Vector3(0, 1, 0).applyQuaternion(chassiQuat).normalize()
                const vetorTras = new THREE.Vector3(0, 0, -1).applyQuaternion(chassiQuat).normalize()

                if (!initCam.current) {
                    const offsetInicial = vetorTras.clone().multiplyScalar(200).add(vetorCima.clone().multiplyScalar(15))
                    state.camera.position.copy(alvoCamera).add(offsetInicial)
                    initCam.current = true
                }

                const currentOffset = state.camera.position.clone().sub(alvoCamera)
                const distance = currentOffset.length()
                const estaParado = Math.abs(velAtual) < 0.5

                if (isDragging.current || estaParado) {
                    angulosRelativos.current.pitch = currentOffset.angleTo(vetorCima)
                } else {
                    const pitch = angulosRelativos.current.pitch
                    const idealOffset = new THREE.Vector3()
                        .copy(vetorCima).multiplyScalar(Math.cos(pitch))
                        .add(vetorTras.clone().multiplyScalar(Math.sin(pitch)))
                        .normalize()
                    currentOffset.normalize()
                    const angleToIdeal = currentOffset.angleTo(idealOffset)

                    if (angleToIdeal > 0.001) {
                        let axis = new THREE.Vector3().crossVectors(currentOffset, idealOffset)
                        if (axis.lengthSq() < 0.0001) axis.copy(vetorCima)
                        axis.normalize()
                        currentOffset.applyAxisAngle(axis, angleToIdeal * 0.08)
                    }
                    currentOffset.multiplyScalar(distance)
                    state.camera.position.copy(alvoCamera).add(currentOffset)
                }
                state.controls.target.copy(alvoCamera)
                state.controls.update()
            }

            posAnterior.current.copy(chassiRef.current.position)

            if (rodaEsqFrenteRef.current && rodaDirFrenteRef.current) {
                rodaEsqFrenteRef.current.rotation.y = anguloAtual
                rodaDirFrenteRef.current.rotation.y = anguloAtual
            }
        }
        setVelocidade(velAtual)
        setAnguloVolante(anguloAtual)
    })

    const metadeLargura = config.dimensoes.largura / 2
    const metadeComprimentoRodas = config.dimensoes.comprimentorodas / 2
    const raioRoda = config.rodas.raio
    const larguraRoda = config.rodas.largura
    const segRodas = config.rodas.segmentos
    const alturaChao = config.dimensoes.alturachao

    return (
        <group ref={chassiRef} position={posicaoInicial}>
            <Chassi matiz={matiz} dimensoes={config.dimensoes} />

            <group ref={rodaEsqFrenteRef} position={[-metadeLargura, raioRoda, metadeComprimentoRodas]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[raioRoda, raioRoda, larguraRoda, segRodas]} />
                    <meshStandardMaterial color="#1a1a1a" />
                </mesh>
            </group>

            <group ref={rodaDirFrenteRef} position={[metadeLargura, raioRoda, metadeComprimentoRodas]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[raioRoda, raioRoda, larguraRoda, segRodas]} />
                    <meshStandardMaterial color="#1a1a1a" />
                </mesh>
            </group>

            <mesh position={[-metadeLargura, raioRoda, -metadeComprimentoRodas]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[raioRoda, raioRoda, larguraRoda, segRodas]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>

            <mesh position={[metadeLargura, raioRoda, -metadeComprimentoRodas]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[raioRoda, raioRoda, larguraRoda, segRodas]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>
        </group>
    )
}