import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { obteralturaterrenoem, obternormalterrenoem } from './Terreno'

function Chassi({ matiz, dimensoes }) {
    const geometria = useMemo(() => {
        const metadelarg = dimensoes.largura / 2
        const metadecomp = dimensoes.comprimento / 2
        const alturachao = dimensoes.alturachao
        const alturaporta = alturachao + dimensoes.alturaporta
        const alturaparabrisa = dimensoes.alturaparabrisa
        const comp = dimensoes.comprimento

        const c = []

        c[0] = new THREE.Vector3(-metadelarg, alturachao, -metadecomp)
        c[1] = new THREE.Vector3(metadelarg, alturachao, -metadecomp)
        c[2] = new THREE.Vector3(metadelarg, alturachao, metadecomp)
        c[3] = new THREE.Vector3(-metadelarg, alturachao, metadecomp)

        c[4] = new THREE.Vector3(-metadelarg, alturaporta, -metadecomp)
        c[5] = new THREE.Vector3(metadelarg, alturaporta, -metadecomp)
        c[6] = new THREE.Vector3(metadelarg, alturaporta, metadecomp)
        c[7] = new THREE.Vector3(-metadelarg, alturaporta, metadecomp)

        c[8] = new THREE.Vector3(-metadelarg, alturaporta + alturaparabrisa, -metadecomp + (comp * dimensoes.taxaTopoCockpitTras))
        c[9] = new THREE.Vector3(metadelarg, alturaporta + alturaparabrisa, -metadecomp + (comp * dimensoes.taxaTopoCockpitTras))
        c[10] = new THREE.Vector3(metadelarg, alturaporta + alturaparabrisa, -metadecomp + (comp * dimensoes.taxaTopoCockpitFrente))
        c[11] = new THREE.Vector3(-metadelarg, alturaporta + alturaparabrisa, -metadecomp + (comp * dimensoes.taxaTopoCockpitFrente))

        c[12] = new THREE.Vector3(-metadelarg, alturaporta, -metadecomp + (comp * dimensoes.taxaBaseCockpitTras))
        c[13] = new THREE.Vector3(metadelarg, alturaporta, -metadecomp + (comp * dimensoes.taxaBaseCockpitTras))
        c[14] = new THREE.Vector3(metadelarg, alturaporta, -metadecomp + (comp * dimensoes.taxaBaseCockpitFrente))
        c[15] = new THREE.Vector3(-metadelarg, alturaporta, -metadecomp + (comp * dimensoes.taxaBaseCockpitFrente))

        const vertices = []

        const addquad = (p1, p2, p3, p4) => {
            vertices.push(p1.x, p1.y, p1.z)
            vertices.push(p2.x, p2.y, p2.z)
            vertices.push(p3.x, p3.y, p3.z)

            vertices.push(p1.x, p1.y, p1.z)
            vertices.push(p3.x, p3.y, p3.z)
            vertices.push(p4.x, p4.y, p4.z)
        }

        addquad(c[0], c[1], c[2], c[3])
        addquad(c[4], c[5], c[6], c[7])
        addquad(c[0], c[1], c[5], c[4])
        addquad(c[3], c[2], c[6], c[7])
        addquad(c[0], c[3], c[7], c[4])
        addquad(c[1], c[2], c[6], c[5])

        addquad(c[8], c[9], c[10], c[11])
        addquad(c[8], c[9], c[13], c[12])
        addquad(c[11], c[10], c[14], c[15])
        addquad(c[8], c[11], c[15], c[12])
        addquad(c[9], c[10], c[14], c[13])

        const arrayfloat = new Float32Array(vertices)
        const geo = new THREE.BufferGeometry()

        geo.setAttribute('position', new THREE.BufferAttribute(arrayfloat, 3))
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

export default function Veiculo({ matiz = 0, posicaoInicial = [0, 0, 0], config, segueCamera = false }) {
    const chassiref = useRef()
    const rodaesqfrenteref = useRef()
    const rodadirfrenteref = useRef()
    const [, get] = useKeyboardControls()

    const [velocidade, setvelocidade] = useState(0)
    const [angulovolante, setangulovolante] = useState(0)
    const [rotacaocarro, setrotacaocarro] = useState(0)

    const posAnterior = useRef(new THREE.Vector3(...posicaoInicial))

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

        let velatual = velocidade
        let anguloatual = angulovolante

        if (frente) {
            velatual += config.fisica.aceleracao
            if (velatual > config.fisica.velmax) velatual = config.fisica.velmax
        } else if (tras) {
            if (velatual > 0) {
                velatual -= config.fisica.aceleracaoFreio
                if (velatual < config.fisica.velmin) velatual = config.fisica.velmin
            }
            else {
                velatual -= config.fisica.aceleracao
                if (velatual < config.fisica.velmaxre) velatual = config.fisica.velmaxre
            }
        } else {
            velatual *= config.fisica.atritoEscalar
            const atritoMecanico = config.fisica.atritoLinear;
            if (velatual > atritoMecanico) {
                velatual -= atritoMecanico;
            } else if (velatual < -atritoMecanico) {
                velatual += atritoMecanico;
            } else {
                velatual = 0;
            }
        }

        const velVolanteDinamica = config.fisica.velocidadeVolante;
        let limiteVolanteDinamico = config.fisica.anguloVolanteMax;
        const aderenciaPista = config.fisica.aderenciaPista;
        const velParaCalculoAtrito = Math.max(0.0001, Math.abs(velatual));
        const limiteAtritoPneu = (aderenciaPista * config.dimensoes.comprimentorodas) / (velParaCalculoAtrito * velParaCalculoAtrito);
        limiteVolanteDinamico = Math.min(limiteVolanteDinamico, limiteAtritoPneu);
        console.log(limiteVolanteDinamico)

        if (esquerda) {
            anguloatual += velVolanteDinamica;
            if (anguloatual > limiteVolanteDinamico) anguloatual = limiteVolanteDinamico;
        } else if (direita) {
            anguloatual -= velVolanteDinamica;
            if (anguloatual < -limiteVolanteDinamico) anguloatual = -limiteVolanteDinamico;
        } else {
            if (anguloatual > 0) {
                anguloatual -= velVolanteDinamica;
                if (anguloatual < 0) anguloatual = 0;
            } else if (anguloatual < 0) {
                anguloatual += velVolanteDinamica;
                if (anguloatual > 0) anguloatual = 0;
            }
        }
        anguloatual = THREE.MathUtils.clamp(anguloatual, -limiteVolanteDinamico, limiteVolanteDinamico);

        setvelocidade(velatual)
        setangulovolante(anguloatual)

        if (chassiref.current) {
            const taxagiro = (velatual / config.dimensoes.comprimentorodas) * Math.tan(anguloatual)
            let novarotacao = rotacaocarro + taxagiro
            setrotacaocarro(novarotacao)
            const posx = chassiref.current.position.x
            const posz = chassiref.current.position.z
            const cima = obternormalterrenoem(posx, posz)
            const rotacaoVolante = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), novarotacao)
            const inclinacaoChao = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), cima)
            const rotacaoFinal = new THREE.Quaternion().multiplyQuaternions(inclinacaoChao, rotacaoVolante)
            const frentevetor = new THREE.Vector3(0, 0, 1).applyQuaternion(rotacaoFinal)
            chassiref.current.position.x += frentevetor.x * velatual
            chassiref.current.position.z += frentevetor.z * velatual
            chassiref.current.position.y = obteralturaterrenoem(chassiref.current.position.x, chassiref.current.position.z)
            chassiref.current.quaternion.slerp(rotacaoFinal, 0.15)

            if (segueCamera && state.controls) {
                const alturaDaCamera = new THREE.Vector3(0, config.dimensoes.alturachao + config.dimensoes.alturaporta + config.dimensoes.alturaparabrisa)
                const alvocamera = chassiref.current.position.clone().add(alturaDaCamera)
                const deltaMove = new THREE.Vector3().subVectors(chassiref.current.position, posAnterior.current)
                state.camera.position.add(deltaMove)
                const chassiQuat = chassiref.current.quaternion
                const vetorCima = new THREE.Vector3(0, 1, 0).applyQuaternion(chassiQuat).normalize()
                const vetorTras = new THREE.Vector3(0, 0, -1).applyQuaternion(chassiQuat).normalize()
                const currentOffset = state.camera.position.clone().sub(alvocamera)
                const distance = currentOffset.length()
                if (!initCam.current) {
                    angulosRelativos.current.pitch = currentOffset.angleTo(vetorCima) || (Math.PI / 3)
                    initCam.current = true
                }
                const estaParado = Math.abs(velatual) < 0.5
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
                    state.camera.position.copy(alvocamera).add(currentOffset)
                }
                state.controls.target.copy(alvocamera)
                state.controls.update()
            }
            posAnterior.current.copy(chassiref.current.position)
            if (rodaesqfrenteref.current && rodadirfrenteref.current) {
                rodaesqfrenteref.current.rotation.y = anguloatual
                rodadirfrenteref.current.rotation.y = anguloatual
            }
        }
    })

    const metadelarg = config.dimensoes.largura / 2
    const metadecomp = config.dimensoes.comprimentorodas / 2
    const raioroda = config.rodas.raio
    const larguraroda = config.rodas.largura
    const segrodas = config.rodas.segmentos
    const alturachao = config.dimensoes.alturachao
    const rodaRaio = config.rodas.raio

    return (
        <group ref={chassiref} position={posicaoInicial}>
            <Chassi matiz={matiz} dimensoes={config.dimensoes} />

            <group ref={rodaesqfrenteref} position={[-metadelarg, rodaRaio, metadecomp]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[raioroda, raioroda, larguraroda, segrodas]} />
                    <meshStandardMaterial color="#1a1a1a" />
                </mesh>
            </group>

            <group ref={rodadirfrenteref} position={[metadelarg, rodaRaio, metadecomp]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[raioroda, raioroda, larguraroda, segrodas]} />
                    <meshStandardMaterial color="#1a1a1a" />
                </mesh>
            </group>

            <mesh position={[-metadelarg, rodaRaio, -metadecomp]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[raioroda, raioroda, larguraroda, segrodas]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>

            <mesh position={[metadelarg, rodaRaio, -metadecomp]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[raioroda, raioroda, larguraroda, segrodas]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>
        </group>
    )
}