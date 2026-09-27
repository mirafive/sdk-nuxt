<script setup lang="ts">
const checkout = useFlag("new-checkout", false)
const limits = useFlagConfig("limits", { max: 1 })
const mira = useMira()
</script>

<template>
  <main>
    <h1>MIRA FIVE playground</h1>
    <p id="checkout">new-checkout: {{ checkout }}</p>
    <p id="limits">limits.max: {{ limits.max }}</p>
    <button type="button" @click="mira.consent(true)">Allow statistics</button>
    <button type="button" @click="mira.track('signup', { plan: 'pro' })">Track signup</button>
  </main>
</template>
