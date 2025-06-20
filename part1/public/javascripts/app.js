const { createApp } = Vue;

createApp({
    data() {
        return {
            dogImage: ''
        };
    },
    methods: {
        async fetchDogImage() {
            const response = await fetch('https://dog.ceo/api/breeds/image/random');
            const data = await response.json();
            this.dogImage = data.message;
        }
    },
    mounted() {
        this.fetchDogImage();
    }
}).mount('#app');