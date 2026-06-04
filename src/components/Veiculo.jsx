import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { obteralturaterrenoem, obternormalterrenoem } from '../mapa'

function Chassi({ matiz }) {
    const geometria = useMemo(() => {
        const metadelarg = 5
        const metadecomp = 10
        const alturachao = 2
        const alturaporta = alturachao + 4.5
        const alturaparabrisa = 4.5
        const comp = 20

        const c = []

        c[0] = new THREE.Vector3(-metadelarg, alturachao, -metadecomp)
        c[1] = new THREE.Vector3(metadelarg, alturachao, -metadecomp)
        c[2] = new THREE.Vector3(metadelarg, alturachao, metadecomp)
        c[3] = new THREE.Vector3(-metadelarg, alturachao, metadecomp)

        c[4] = new THREE.Vector3(-metadelarg, alturaporta, -metadecomp)
        c[5] = new THREE.Vector3(metadelarg, alturaporta, -metadecomp)
        c[6] = new THREE.Vector3(metadelarg, alturaporta, metadecomp)
        c[7] = new THREE.Vector3(-metadelarg, alturaporta, metadecomp)

        c[8] = new THREE.Vector3(-metadelarg, alturaporta + alturaparabrisa, -metadecomp + (comp * 0.2))
        c[9] = new THREE.Vector3(metadelarg, alturaporta + alturaparabrisa, -metadecomp + (comp * 0.2))
        c[10] = new THREE.Vector3(metadelarg, alturaporta + alturaparabrisa, -metadecomp + (comp * 0.6))
        c[11] = new THREE.Vector3(-metadelarg, alturaporta + alturaparabrisa, -metadecomp + (comp * 0.6))

        c[12] = new THREE.Vector3(-metadelarg, alturaporta, -metadecomp + (comp * 0.1))
        c[13] = new THREE.Vector3(metadelarg, alturaporta, -metadecomp + (comp * 0.1))
        c[14] = new THREE.Vector3(metadelarg, alturaporta, -metadecomp + (comp * 0.7))
        c[15] = new THREE.Vector3(-metadelarg, alturaporta, -metadecomp + (comp * 0.7))

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
    }, [])

    const cor = useMemo(() => {
        return new THREE.Color().setHSL(matiz, 1.0, 0.5)
    }, [matiz])

    return (
        <mesh geometry={geometria}>
            <meshStandardMaterial color={cor} side={THREE.DoubleSide} />
        </mesh>
    )
}

export default function Veiculo({ matiz = 0, posicaoInicial = [0, 0, 0] }) {
    const chassiref = useRef()
    const rodaesqfrenteref = useRef()
    const rodadirfrenteref = useRef()
    const [, get] = useKeyboardControls()

    const [velocidade, setvelocidade] = useState(0)
    const [angulovolante, setangulovolante] = useState(0)
    const [rotacaocarro, setrotacaocarro] = useState(0)

    const fisica = {
        aceleracao: 0.01,
        desaceleracao: 0.95,
        velmax: 1.0,
        velmin: -0.25,
        velvolante: 0.02,
        limitevolante: 0.7,
        comprimentorodas: 13.0
    }

    useFrame(() => {
        const { frente, tras, esquerda, direita } = get()

        let velatual = velocidade
        let anguloatual = angulovolante

        if (frente) {
            velatual += fisica.aceleracao
            if (velatual > fisica.velmax) velatual = fisica.velmax
        } else if (tras) {
            velatual -= fisica.aceleracao
            if (velatual < fisica.velmin) velatual = fisica.velmin
        } else {
            velatual *= fisica.desaceleracao
        }

        if (esquerda) {
            anguloatual += fisica.velvolante
            if (anguloatual > fisica.limitevolante) anguloatual = fisica.limitevolante
        } else if (direita) {
            anguloatual -= fisica.velvolante
            if (anguloatual < -fisica.limitevolante) anguloatual = -fisica.limitevolante
        } else {
            anguloatual *= 0.85
        }

        setvelocidade(velatual)
        setangulovolante(anguloatual)

        if (chassiref.current) {
            const fvel = 1.0 / (1.0 + Math.abs(velatual) * 0.5)
            const taxagiro = (velatual / fisica.comprimentorodas) * Math.tan(anguloatual) * fvel

            let novarotacao = rotacaocarro + taxagiro
            setrotacaocarro(novarotacao)

            chassiref.current.position.x += Math.sin(novarotacao) * velatual
            chassiref.current.position.z += Math.cos(novarotacao) * velatual

            const posx = chassiref.current.position.x
            const posz = chassiref.current.position.z

            chassiref.current.position.y = obteralturaterrenoem(posx, posz)

            const cima = obternormalterrenoem(posx, posz)
            const direcaoplana = new THREE.Vector3(Math.sin(novarotacao), 0, Math.cos(novarotacao))
            const direitavetor = new THREE.Vector3().crossVectors(cima, direcaoplana).normalize()
            const frentevetor = new THREE.Vector3().crossVectors(direitavetor, cima).normalize()

            const matriz = new THREE.Matrix4().makeBasis(direitavetor, cima, frentevetor)
            chassiref.current.quaternion.setFromRotationMatrix(matriz)
        }

        if (rodaesqfrenteref.current && rodadirfrenteref.current) {
            rodaesqfrenteref.current.rotation.y = anguloatual
            rodadirfrenteref.current.rotation.y = anguloatual
        }
    })

    return (
        <group ref={chassiref} position={posicaoInicial}>
            <Chassi matiz={matiz} />

            <group ref={rodaesqfrenteref} position={[-5, 2, 6.5]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[2, 2, 1.5, 16]} />
                    <meshStandardMaterial color="#1a1a1a" />
                </mesh>
            </group>

            <group ref={rodadirfrenteref} position={[5, 2, 6.5]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[2, 2, 1.5, 16]} />
                    <meshStandardMaterial color="#1a1a1a" />
                </mesh>
            </group>

            <mesh position={[-5, 2, -6.5]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[2, 2, 1.5, 16]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>

            <mesh position={[5, 2, -6.5]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[2, 2, 1.5, 16]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>
        </group>
    )
}