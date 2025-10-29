const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const getUsers = async () => {
  const res = await fetch("https://jsonplaceholder.typicode.com/users");
  return res.json();
};

export const getShowtimes = async () => {
  return [
    {
      id: 1,
      title: "Mưa Đỏ – T3",
      times: [
        "09:15",
        "09:30",
        "09:45",
        "10:00",
        "10:15",
        "10:30",
        "10:30",
        "10:45",
      ],
    },
    {
      id: 2,
      title: "Bão Trắng – T4",
      times: [
        "11:00",
        "11:15",
        "11:30",
        "11:45",
        "12:00",
        "12:15",
        "12:30",
        "12:45",
      ],
    },
    {
      id: 3,
      title: "Ánh Sáng Vàng – T5",
      times: [
        "13:00",
        "13:15",
        "13:30",
        "13:45",
        "14:00",
        "14:15",
        "14:30",
        "14:45",
      ],
    },
    {
      id: 4,
      title: "Sóng Biển – T6",
      times: [
        "15:00",
        "15:15",
        "15:30",
        "15:45",
        "16:00",
        "16:15",
        "16:30",
        "16:45",
      ],
    },
    {
      id: 5,
      title: "Tôi Thấy Hoa Vàng Trên Cỏ Xanh",
      times: [
        "17:00",
        "17:15",
        "17:30",
        "17:45",
        "18:00",
        "18:15",
        "18:30",
        "18:45",
      ],
    },
    {
      id: 6,
      title: "Cà Phê Nguyên Chất",
      times: [
        "19:00",
        "19:15",
        "19:30",
        "19:45",
        "20:00",
        "20:15",
        "20:30",
        "20:45",
      ],
    },
    {
      id: 7,
      title: "Bầu Trời Xanh",
      times: [
        "21:00",
        "21:15",
        "21:30",
        "21:45",
        "22:00",
        "22:15",
        "22:30",
        "22:45",
      ],
    },
    {
      id: 8,
      title: "Đêm Trăng Soi Đường",
      times: [
        "23:00",
        "23:15",
        "23:30",
        "23:45",
        "00:00",
        "00:15",
        "00:30",
        "00:45",
      ],
    },
    {
      id: 9,
      title: "Âm Nhạc Và Đời Sống",
      times: [
        "01:00",
        "01:15",
        "01:30",
        "01:45",
        "02:00",
        "02:15",
        "02:30",
        "02:45",
      ],
    },
  ];
};

export const getSeats = async () => {
  return [
    {
      row: "A",
      seats: [
        { number: 1, status: "new" },
        { number: 2, status: "new" },
        { number: 3, status: "new" },
        { number: 4, status: "new" },
        { number: 5, status: "new" },
        { number: 6, status: "new" },
        { number: 7, status: "new" },
        { number: 8, status: "new" },
        { number: 9, status: "new" },
        { number: 10, status: "new" },
        { number: 11, status: "new" },
        { number: 12, status: "new" },
        { number: 13, status: "new" },
        { number: 14, status: "new" },
        { number: 15, status: "new" },
        { number: 16, status: "new" },
        { number: 17, status: "new" },
        { number: 18, status: "new" },
      ],
    },
    {
      row: "E",
      seats: [
        { number: 6, status: "contract" },
        { number: 7, status: "contract" },
        { number: 8, status: "contract" },
        { number: 9, status: "contract" },
        { number: 10, status: "contract" },
        { number: 11, status: "contract" },
      ],
    },
    {
      row: "H",
      seats: [{ number: 7, status: "sold" }],
    },
    {
      row: "D",
      seats: [{ number: 15, status: "selected" }],
    },
    {
      row: "J",
      seats: [
        { number: 6, status: "sold" },
        { number: 7, status: "sold" },
        { number: 8, status: "sold" },
        { number: 9, status: "sold" },
        { number: 10, status: "sold" },
        { number: 11, status: "sold" },
        { number: 12, status: "sold" },
        { number: 13, status: "sold" },
        { number: 14, status: "sold" },
      ],
    },
  ];
};

export const onRefreshToken = async (refreshToken: string) => {
  const url = new URL("/api/v1/staff/refresh-token", BASE_URL);

  return await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
};
