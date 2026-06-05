import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const GramadoInstanced = ({ gramas }) => {
    const meshRef = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const geometria = useMemo(() => {
        const geo = new THREE.ConeGeometry(3.0, 10.0, 2)
        geo.rotateY(Math.PI / 2)
        geo.computeVertexNormals();
        const normais = geo.attributes.normal;
        for (let i = 0; i < normais.count; i++) {
            normais.setXYZ(i, 0, 1, 0);
        }
        return geo
    }, [])

    useFrame((state) => {
        if (!meshRef.current) return;
        gramas.forEach((grama, i) => {
            const yAtual = grama.posicao.y + 5.0;
            dummy.position.set(grama.posicao.x, yAtual, grama.posicao.z)
            if (grama.normal) {
                dummy.up.copy(grama.normal)
            } else {
                dummy.up.set(0, 1, 0)
            }
            dummy.lookAt(
                state.camera.position.x,
                yAtual,
                state.camera.position.z
            )

            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
        })
        meshRef.current.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometria, undefined, gramas.length]}
        >
            <meshLambertMaterial
                color="#baff4b" 
                side={THREE.DoubleSide}
            />
        </instancedMesh>
    )
}