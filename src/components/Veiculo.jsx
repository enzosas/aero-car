import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import Chassi from './Chassi'
import { obteralturaterrenoem, obternormalterrenoem } from '../mapa'

export default function Veiculo() {
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
        <group ref={chassiref} position={[0, 0, 0]}>
            <Chassi />

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