"""Extract three static rock meshes from Motri's MIT-licensed scenery GLB.

Usage: python scripts/extract-motri-scenery.py /path/to/scenery.glb
Source: 3wasfnjd/Motri @ ee7e01dfe848f1bc7e857d51bcee2e687bee21eb
The original source file is not shipped; runtime needs no Draco decoder.
"""
import json
import pathlib
import struct
import sys

source = pathlib.Path(sys.argv[1]).read_bytes()
json_size = struct.unpack_from('<I', source, 12)[0]
original = json.loads(source[20:20 + json_size])
binary = source[28 + json_size:]
result = {'asset': {'version': '2.0', 'generator': 'SANDLINE Motri mesh extraction'},
          'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [],
          'accessors': [], 'bufferViews': [], 'buffers': []}
out = bytearray()
chosen = [('basaltRocksPhysicalStatic.003', 'motri_basalt_a'),
          ('basaltRocksPhysicalStatic.004', 'motri_basalt_b'),
          ('basaltRocksPhysicalStatic.001', 'motri_basalt_cluster')]

def copy_accessor(index):
    acc = dict(original['accessors'][index])
    view = original['bufferViews'][acc['bufferView']]
    start = view.get('byteOffset', 0)
    while len(out) % 4:
        out.append(0)
    new_view = dict(view, buffer=0, byteOffset=len(out))
    out.extend(binary[start:start + view['byteLength']])
    acc['bufferView'] = len(result['bufferViews'])
    result['bufferViews'].append(new_view)
    result['accessors'].append(acc)
    return len(result['accessors']) - 1

for source_name, name in chosen:
    node = next(n for n in original['nodes'] if n.get('name') == source_name)
    mesh = original['meshes'][node['mesh']]
    primitives = []
    for primitive in mesh['primitives']:
        primitives.append({'attributes': {k: copy_accessor(v) for k, v in primitive['attributes'].items()
                                           if k in ('POSITION', 'NORMAL')},
                           'indices': copy_accessor(primitive['indices'])})
    index = len(result['nodes'])
    result['nodes'].append({'name': name, 'mesh': index})
    result['scenes'][0]['nodes'].append(index)
    result['meshes'].append({'name': name, 'primitives': primitives})

result['buffers'].append({'byteLength': len(out)})
text = json.dumps(result, separators=(',', ':')).encode()
text += b' ' * (-len(text) % 4)
out += b'\0' * (-len(out) % 4)
glb = struct.pack('<III', 0x46546c67, 2, 28 + len(text) + len(out))
glb += struct.pack('<II', len(text), 0x4e4f534a) + text
glb += struct.pack('<II', len(out), 0x004e4942) + out
destination = pathlib.Path('public/assets/motri-basalt.glb')
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_bytes(glb)
print(json.dumps({'output': str(destination), 'bytes': len(glb), 'meshes': len(chosen),
                  'triangles': [sum(result['accessors'][p['indices']]['count'] // 3 for p in m['primitives'])
                                for m in result['meshes']]}))
