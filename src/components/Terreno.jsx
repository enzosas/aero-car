import { useMemo } from 'react'
import * as THREE from 'three'
import { malha, pontostotal } from '../mapa'

export default function Terreno() {
    const geometria = useMemo(() => {
        const vertices = []

        const addquad = (p1, p2, p3, p4) => {
            vertices.push(p1.x, p1.y, p1.z)
            vertices.push(p2.x, p2.y, p2.z)
            vertices.push(p3.x, p3.y, p3.z)

            vertices.push(p1.x, p1.y, p1.z)
            vertices.push(p3.x, p3.y, p3.z)
            vertices.push(p4.x, p4.y, p4.z)
        }

        for (let i = 0; i < pontostotal - 1; i++) {
            for (let j = 0; j < pontostotal - 1; j++) {
                const v00 = malha[i][j]
                const v10 = malha[i + 1][j]
                const v01 = malha[i][j + 1]
                const v11 = malha[i + 1][j + 1]

                addquad(v00, v10, v11, v01)
            }
        }

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
        geo.computeVertexNormals()

        return geo
    }, [])

    return (
        <mesh geometry={geometria}>
            <meshStandardMaterial color="#86c947" side={THREE.DoubleSide} />
        </mesh>
    )
}