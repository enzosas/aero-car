import { useMemo } from 'react'
import * as THREE from 'three'

export default function Chassi() {
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

    return (
        <mesh geometry={geometria}>
            <meshStandardMaterial color="#cc3333" side={THREE.DoubleSide} />
        </mesh>
    )
}