"""Independent executable checks of draft v1 framing and five-argument ABI hash.
Requires the locally available eth_abi/eth_hash packages and Foundry cast.
"""
import json
import subprocess
from eth_abi import encode
from eth_hash.auto import keccak


def parse(data):
    result, seen, p = [], set(), 0
    while p < len(data):
        if len(data) - p < 6 or data[p:p+2] != b'\x00\x01':
            raise ValueError('header/version')
        kind = data[p+2:p+4]
        r = data[p+4]
        if not r or len(data) - p < 6 + r or data[p+5+r] != 0:
            raise ValueError('reference/address')
        ref = data[p+5:p+5+r]
        if kind == b'\x00\x00' and (r > 32 or ref[0] == 0):
            raise ValueError('noncanonical EIP155')
        chain = (kind, ref)
        if chain in seen:
            raise ValueError('duplicate')
        seen.add(chain)
        result.append(data[p:p+6+r].hex())
        p += 6+r
    return result

eth = bytes.fromhex('00010000010100')
base = bytes.fromhex('0001000002210500')
arb = bytes.fromhex('0001000002a4b100')
assert parse(base+eth) == [base.hex(),eth.hex()]
assert parse(eth+arb) == [eth.hex(),arb.hex()]
assert parse(b'') == []
opaque = bytes.fromhex('0001ffff01ff00')
assert parse(opaque+eth) == [opaque.hex(),eth.hex()]
malformed = [eth+eth, eth+b'\x00', bytes.fromhex('000100000000'),
             bytes.fromhex('00020000010100'),bytes.fromhex('80010000010100'),
             bytes.fromhex('00010000010000'),bytes.fromhex('0001000002000100'),
             bytes.fromhex('0001000001010101'),
             bytes.fromhex('0001000021')+bytes([1])*33+b'\x00']
malformed += [eth[:n] for n in range(1,len(eth))]
malformed += [eth+x for x in malformed[:9]]
for data in malformed:
    try:
        parse(data)
    except ValueError:
        pass
    else:
        raise AssertionError(data.hex())
args = ['Ether','ETH',[eth,arb],[0,0],[0,0]]
encoded = encode(['string','string','bytes[]','uint256[]','uint256[]'],args)
hash_hex = '0x'+keccak(encoded).hex()
cast_encoded = subprocess.check_output(['cast','abi-encode','f(string,string,bytes[],uint256[],uint256[])',
    'Ether','ETH','[0x'+eth.hex()+',0x'+arb.hex()+']','[0,0]','[0,0]'],text=True).strip()
assert cast_encoded == '0x'+encoded.hex()
assert subprocess.check_output(['cast','keccak',cast_encoded],text=True).strip() == hash_hex
wrong_tuple = encode(['(string,string,bytes[],uint256[],uint256[])'],[args])
assert keccak(wrong_tuple) != keccak(encoded)
print(json.dumps({'checks':'passed','invalid_payloads_rejected':len(malformed),
 'ether_snapshot_hash':hash_hex,'data_key':f'payment-preference[{hash_hex}]',
 'ethereum_arbitrum_value':'0x'+(eth+arb).hex(),'base_ethereum_value':'0x'+(base+eth).hex(),
 'abi_encoding_bytes':len(encoded),'cross_checked':'eth_abi + eth_hash vs cast'},indent=2))
