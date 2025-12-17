## Prerequisites

- Node.js (v14 atau lebih tinggi)
- MySQL Database
- npm

## Installation

1. Clone repository ini
2. Install dependencies:
```bash
npm install
```

## Configuration

### Environment Variables

Buat file `.env` di root directory dan set konfigurasi.

### Database Setup

1. Buat database MySQL:
```sql
CREATE DATABASE db_iot;
```

2. Generate models dari database (opsional, jika struktur DB sudah ada):
```bash
npm exec sequelize-auto -- -o "./models" -d db_iot -h localhost -u root -p 3306 -e mysql
```

## Deployment

Untuk menjalankan aplikasi di production:

```bash
npm start
```

## Development

Untuk menjalankan aplikasi di development mode:

```bash
npm run dev
```

## Scripts

- `npm start` - Menjalankan aplikasi di production mode
- `npm run dev` - Menjalankan aplikasi di development mode

## Auto-Generate Models

Project ini menggunakan `sequelize-auto` untuk generate models dari database yang sudah ada:

```bash
npm exec sequelize-auto -- -o "./models" -d db_iot -h localhost -u root -p 3306 -e mysql
```

Parameter:
- `-o` : Output directory untuk models
- `-d` : Nama database
- `-h` : Database host
- `-u` : Database user
- `-p` : Database port
- `-e` : Database engine (mysql)

## License

[SMARTGRAPE.ID]

## Contact

[Instagram : @ab.raaa]