import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const GramadoInstanced = ({ gramas }) => {
    const meshRef = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const geometria = useMemo(() => {
        const geo = new THREE.ConeGeometry(3.0, 10.0, 2)
        geo.rotateY(Math.PI / 2);
        const normaisArray = new Float32Array(gramas.length * 3);
        gramas.forEach((grama, i) => {
            const n = grama.normal || new THREE.Vector3(0, 1, 0);
            normaisArray[i * 3 + 0] = n.x;
            normaisArray[i * 3 + 1] = n.y;
            normaisArray[i * 3 + 2] = n.z;
        });
        geo.setAttribute('aTerrainNormal', new THREE.InstancedBufferAttribute(normaisArray, 3));
        return geo
    }, [gramas])
    useFrame((state) => {
        if (!meshRef.current) return;
        gramas.forEach((grama, i) => {
            const yAtual = grama.posicao.y + 5.0;
            dummy.position.set(grama.posicao.x, yAtual, grama.posicao.z)
            dummy.up.set(0, 1, 0);
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
            <meshStandardMaterial
                color="#baff4b"
                side={THREE.DoubleSide}
                roughness={1}
                metalness={0}
                onBeforeCompile={(shader) => {
                    shader.vertexShader = `
                        attribute vec3 aTerrainNormal;
                        varying vec3 vTerrainNormal;
                        ${shader.vertexShader}
                    `.replace(
                        '#include <beginnormal_vertex>',
                        `
                        #include <beginnormal_vertex>
                        vTerrainNormal = (viewMatrix * vec4(aTerrainNormal, 0.0)).xyz;
                        `
                    );
                    shader.fragmentShader = `
                        varying vec3 vTerrainNormal;
                        ${shader.fragmentShader}
                    `.replace(
                        '#include <normal_fragment_begin>',
                        `
                        #include <normal_fragment_begin>
                        normal = normalize(vTerrainNormal);
                        `
                    );
                }}
            />
        </instancedMesh>
    )
}