import type { Circuit, GateType, InputNode, NodeId, OutputNode } from './types'

/**
 * Avalia uma única porta (sem precisar montar um Circuit) — usado por testes
 * e por fases que só precisam checar uma porta isolada. NOT usa só o
 * primeiro valor; as demais aceitam 2 ou mais entradas.
 */
export function evaluateGate(gate: GateType, inputs: readonly boolean[]): boolean {
  switch (gate) {
    case 'NOT':
      return !inputs[0]
    case 'AND':
      return inputs.every(Boolean)
    case 'OR':
      return inputs.some(Boolean)
    case 'NAND':
      return !inputs.every(Boolean)
    case 'NOR':
      return !inputs.some(Boolean)
    case 'XOR':
      return inputs.filter(Boolean).length % 2 === 1
  }
}

/** true se o circuito é acíclico e toda referência existe e é anterior. */
export function validateCircuit(circuit: Circuit): boolean {
  const seen = new Set<NodeId>()
  for (const node of circuit) {
    if (seen.has(node.id)) return false
    if (node.kind === 'input') {
      seen.add(node.id)
    } else if (node.kind === 'gate') {
      for (const ref of node.inputs) if (!seen.has(ref)) return false
      seen.add(node.id)
    } else {
      if (!seen.has(node.input)) return false
      seen.add(node.id)
    }
  }
  return true
}

/**
 * Avalia um circuito para uma combinação de entradas. Lança erro se houver
 * ciclo ou referência a um nó inexistente/posterior (um nó só pode
 * referenciar algo já avaliado antes dele na lista).
 */
export function evaluateCircuit(
  circuit: Circuit,
  inputValues: Record<NodeId, boolean>,
): Record<NodeId, boolean> {
  const values: Record<NodeId, boolean> = {}
  for (const node of circuit) {
    if (node.kind === 'input') {
      if (!(node.id in inputValues)) {
        throw new Error(`valor de entrada faltando para "${node.id}"`)
      }
      values[node.id] = inputValues[node.id]!
    } else if (node.kind === 'gate') {
      const ins = node.inputs.map((ref) => {
        if (!(ref in values)) {
          throw new Error(`referência inválida ou cíclica: "${ref}" (nó "${node.id}")`)
        }
        return values[ref]!
      })
      values[node.id] = evaluateGate(node.gate, ins)
    } else {
      if (!(node.input in values)) {
        throw new Error(`referência inválida ou cíclica: "${node.input}" (nó "${node.id}")`)
      }
      values[node.id] = values[node.input]!
    }
  }
  return values
}

/**
 * Gera a tabela-verdade completa de um circuito (todas as 2^n combinações das
 * entradas, na ordem binária crescente dos InputNodes na ordem em que
 * aparecem no circuito — o primeiro InputNode é o bit mais significativo).
 * Cada linha: [...entradas, ...saídas], na ordem em que aparecem no circuito.
 */
export function truthTable(circuit: Circuit): readonly boolean[][] {
  const inputs = circuit.filter((n): n is InputNode => n.kind === 'input')
  const outputs = circuit.filter((n): n is OutputNode => n.kind === 'output')
  const n = inputs.length
  const rows: boolean[][] = []
  for (let combo = 0; combo < 2 ** n; combo++) {
    const inputValues: Record<NodeId, boolean> = {}
    inputs.forEach((input, i) => {
      inputValues[input.id] = ((combo >> (n - 1 - i)) & 1) === 1
    })
    const values = evaluateCircuit(circuit, inputValues)
    rows.push([
      ...inputs.map((input) => inputValues[input.id]!),
      ...outputs.map((output) => values[output.id]!),
    ])
  }
  return rows
}
